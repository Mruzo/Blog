import time

import requests
from django.core.management.base import BaseCommand

from vybcheq.fiscal_periods import configured_history_years
from vybcheq.fmp_eod import FmpEodError, sync_security_eod_from_fmp
from vybcheq.models import Security, WatchlistEntry
from vybcheq.fmp_client import fmp_action_gap_seconds


class Command(BaseCommand):
    help = (
        "Pull quarter-end EOD from FMP (~10 years, 1 call per symbol; same as admin action). "
        "Prefer admin for manual control of API quota."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--years",
            type=int,
            default=None,
            help="Years of quarterly history to request (default: VYBCHEQ_FMP_EOD_YEARS / 5 on free tier).",
        )
        parser.add_argument(
            "--all-active",
            action="store_true",
            help="Refresh all active securities instead of watchlist only.",
        )
        parser.add_argument(
            "--symbol",
            type=str,
            help="Single Security.symbol to refresh (optional).",
        )

    def handle(self, *args, **options):
        years = options["years"] if options["years"] is not None else configured_history_years()
        qs = Security.objects.filter(is_active=True)
        if options["symbol"]:
            qs = qs.filter(symbol__iexact=options["symbol"].strip())
        elif not options["all_active"]:
            qs = qs.filter(watchlist_entry__isnull=False).distinct()

        securities = list(qs.order_by("exchange", "symbol"))
        if not securities:
            self.stdout.write(self.style.WARNING("No securities matched; nothing to do."))
            return

        session = requests.Session()
        gap = fmp_action_gap_seconds()
        ok = 0
        errors: list[str] = []

        for i, sec in enumerate(securities):
            if i > 0:
                time.sleep(gap)
            try:
                result = sync_security_eod_from_fmp(
                    sec,
                    years_back=int(years),
                    session=session,
                    update_cached_quote=True,
                )
            except FmpEodError as exc:
                errors.append(f"{sec}: {exc}")
                continue
            if result is None:
                errors.append(f"{sec}: no quarter-end rows stored")
                continue
            ok += 1
            self.stdout.write(
                f"{sec} → {result.quarters_stored} quarters; "
                f"last {result.latest_trade_date} close {result.latest_close}"
            )

        self.stdout.write(
            self.style.SUCCESS(f"Done: {ok}/{len(securities)} securities updated.")
        )
        if errors:
            self.stdout.write(self.style.WARNING("Errors:"))
            for line in errors:
                self.stdout.write(f"  {line}")
