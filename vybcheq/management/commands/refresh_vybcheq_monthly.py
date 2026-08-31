import requests
from django.core.management.base import BaseCommand

from vybcheq.fiscal_periods import configured_fmp_daily_call_budget
from vybcheq.monthly_refresh import (
    PHASE_EOD_CASHFLOW,
    PHASE_FUNDAMENTALS,
    PHASES,
    budget_warning,
    estimate_phase_calls,
    estimated_calls_per_security,
    phase_schedule_hint,
    run_monthly_refresh_phase,
    watchlist_count,
    watchlist_securities,
)
from vybcheq.fmp_client import fmp_action_gap_seconds


class Command(BaseCommand):
    help = (
        "Monthly watchlist refresh in two phases for FMP free tier (250 calls/day). "
        "fundamentals: day before month-end (~3 calls/stock). "
        "eod-cashflow: month-end (~2 calls/stock)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--phase",
            choices=PHASES,
            required=True,
            help="fundamentals (day before month-end) or eod-cashflow (month-end).",
        )
        parser.add_argument(
            "--all-active",
            action="store_true",
            help="All active securities instead of watchlist only.",
        )
        parser.add_argument(
            "--symbol",
            type=str,
            help="Single Security.symbol (optional).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print plan and API estimate only; do not call FMP.",
        )

    def handle(self, *args, **options):
        phase = options["phase"]
        securities = watchlist_securities(
            symbol=options.get("symbol"),
            all_active=options["all_active"],
        )
        n = len(securities)
        est = estimate_phase_calls(n, phase)
        budget = configured_fmp_daily_call_budget()
        per = estimated_calls_per_security(phase)

        self.stdout.write(f"Phase: {phase}")
        self.stdout.write(phase_schedule_hint(phase))
        self.stdout.write(f"Securities: {n} (watchlist has {watchlist_count()} entries)")
        self.stdout.write(f"Estimated API calls: {est} (~{per} × {n})")
        self.stdout.write(f"Daily budget: {budget} (remaining headroom: {max(budget - est, 0)})")

        warn = budget_warning(n, phase)
        if warn:
            self.stdout.write(self.style.WARNING(warn))

        if n == 0:
            self.stdout.write(self.style.WARNING("No securities matched; nothing to do."))
            return

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("Dry run — no FMP calls made."))
            for sec in securities[:10]:
                self.stdout.write(f"  would refresh: {sec.symbol}")
            if n > 10:
                self.stdout.write(f"  … and {n - 10} more")
            return

        if est > budget:
            self.stdout.write(
                self.style.ERROR(
                    "Aborting: estimated calls exceed daily budget. "
                    "Use --dry-run to preview or reduce the universe."
                )
            )
            return

        session = requests.Session()
        gap = fmp_action_gap_seconds()
        self.stdout.write(f"Action gap between securities: {gap}s")

        result = run_monthly_refresh_phase(
            phase,
            securities,
            session=session,
            log=lambda msg: self.stdout.write(msg),
        )

        if result.securities_ok:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Done: {result.securities_ok}/{result.securities_total} "
                    f"securities updated ({result.estimated_calls} est. calls)."
                )
            )
        else:
            self.stdout.write(self.style.ERROR("No securities updated."))

        if result.errors:
            self.stdout.write(self.style.WARNING("Errors:"))
            for line in result.errors:
                self.stdout.write(f"  {line}")
