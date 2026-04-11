from decimal import Decimal

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Case, DecimalField, F, IntegerField, Value, When
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext_lazy as _

from django.views.decorators.http import require_POST

from .forms import ScreeningMetricsForm, SimTradeOpenForm
from .models import ScreenRun, ScreeningRuleSet, Security, SimPosition, WatchlistEntry
from .screening import run_screen_against_watchlist
from .yahoo_metrics import YahooMetricsError, quote_min_interval_seconds
from .sim_trading import (
    close_position,
    get_or_create_cheq_account,
    open_position,
    record_marks_for_user_open_positions,
)


def _screen_run_dashboard_row(run: ScreenRun) -> dict:
    """
    Pass = Yes only if the run finished OK and every security passed all rules.
    Score = mean of per-security rule-completion scores (same scale as screening).
    """
    results = list(run.screen_results.all())
    scores = [r.score for r in results if r.score is not None]
    avg_score = (sum(scores) / len(scores)) if scores else None
    score_display = f"{avg_score:.1f}" if avg_score is not None else "—"

    if run.status == ScreenRun.Status.FAILED:
        return {"run": run, "pass_display": "No", "score_display": score_display}
    if run.status == ScreenRun.Status.PENDING or not results:
        return {"run": run, "pass_display": "—", "score_display": score_display}
    all_pass = all(r.passed for r in results)
    return {
        "run": run,
        "pass_display": "Yes" if all_pass else "No",
        "score_display": score_display,
    }


@staff_member_required
def dashboard(request: HttpRequest) -> HttpResponse:
    wl_count = WatchlistEntry.objects.count()
    sec_count = Security.objects.filter(is_active=True).count()
    recent_screen_runs = list(
        ScreenRun.objects.select_related("rule_set")
        .prefetch_related("screen_results")
        .order_by("-started_at")[:2]
    )
    screen_run_rows = [_screen_run_dashboard_row(r) for r in recent_screen_runs]
    rule_sets_top5 = list(ScreeningRuleSet.objects.all()[:5])
    watchlist_top5 = list(
        WatchlistEntry.objects.select_related("security")
        .filter(
            security__is_active=True,
            security__quote_last_price__isnull=False,
        )
        .order_by("security__quote_last_price", "priority", "security__symbol")[:5]
    )
    active_securities_cap = 300
    active_qs = Security.objects.filter(is_active=True).order_by("exchange", "symbol")
    active_securities = list(active_qs.values("symbol", "exchange")[:active_securities_cap])
    active_securities_truncated = sec_count > active_securities_cap

    cheq_acct = get_or_create_cheq_account(request.user)
    wallet_balance = cheq_acct.balance

    open_base = SimPosition.objects.filter(user=request.user, closed_at__isnull=True)
    open_position_count = open_base.count()
    # Match prior Python sort: valid cached quote first (ascending by quote), else entry price.
    sort_bucket = Case(
        When(
            security__quote_last_price__isnull=False,
            security__quote_last_price__gt=0,
            then=Value(0),
        ),
        default=Value(1),
        output_field=IntegerField(),
    )
    sort_price = Case(
        When(
            security__quote_last_price__isnull=False,
            security__quote_last_price__gt=0,
            then=F("security__quote_last_price"),
        ),
        default=F("entry_price"),
        output_field=DecimalField(max_digits=24, decimal_places=8),
    )
    portfolio_top5 = list(
        open_base.select_related("security")
        .annotate(_portfolio_bucket=sort_bucket, _portfolio_sort=sort_price)
        .order_by("_portfolio_bucket", "_portfolio_sort", "pk")[:5]
    )

    return render(
        request,
        "vybcheq/staff/dashboard.html",
        {
            "watchlist_count": wl_count,
            "security_count": sec_count,
            "screen_run_rows": screen_run_rows,
            "rule_sets_top5": rule_sets_top5,
            "watchlist_top5": watchlist_top5,
            "active_securities": active_securities,
            "active_securities_truncated": active_securities_truncated,
            "wallet_balance": wallet_balance,
            "portfolio_top5": portfolio_top5,
            "open_position_count": open_position_count,
        },
    )


@staff_member_required
def watchlist(request: HttpRequest) -> HttpResponse:
    entries = WatchlistEntry.objects.select_related("security").all()
    return render(
        request,
        "vybcheq/staff/watchlist.html",
        {"entries": entries},
    )


@staff_member_required
def security_metrics(request: HttpRequest, pk: int) -> HttpResponse:
    security = get_object_or_404(Security, pk=pk)
    if request.method == "POST":
        form = ScreeningMetricsForm(request.POST, security=security)
        if form.is_valid():
            form.apply_to_security(security)
            messages.success(request, _("Saved screening metrics for %(s)s.") % {"s": security})
            return redirect("vybcheq_staff:security_metrics", pk=security.pk)
    else:
        form = ScreeningMetricsForm(security=security)
    return render(
        request,
        "vybcheq/staff/security_metrics.html",
        {"security": security, "form": form},
    )


@staff_member_required
def run_screen_pick(request: HttpRequest) -> HttpResponse:
    rule_sets = ScreeningRuleSet.objects.all()
    return render(
        request,
        "vybcheq/staff/run_screen_pick.html",
        {"rule_sets": rule_sets},
    )


@staff_member_required
def run_screen_confirm(request: HttpRequest, rule_set_id: int) -> HttpResponse:
    rule_set = get_object_or_404(ScreeningRuleSet, pk=rule_set_id)
    if request.method == "POST":
        run = run_screen_against_watchlist(rule_set)
        if run.status == ScreenRun.Status.FAILED:
            messages.error(
                request,
                _("Screen run failed: %(err)s") % {"err": run.error_message},
            )
        else:
            n = run.screen_results.count()
            if n == 0:
                messages.warning(
                    request,
                    _(
                        "Run finished with no securities. Add watch list entries "
                        "for tickers you want screened."
                    ),
                )
            else:
                messages.success(
                    request,
                    _("Screen run complete: %(n)s securities.") % {"n": n},
                )
        return redirect("vybcheq_staff:screen_run_detail", pk=run.pk)
    return render(
        request,
        "vybcheq/staff/run_screen_confirm.html",
        {"rule_set": rule_set},
    )


@staff_member_required
def screen_runs(request: HttpRequest) -> HttpResponse:
    runs = ScreenRun.objects.select_related("rule_set")[:50]
    return render(
        request,
        "vybcheq/staff/screen_runs.html",
        {"runs": runs},
    )


@staff_member_required
def screen_run_detail(request: HttpRequest, pk: int) -> HttpResponse:
    run = get_object_or_404(
        ScreenRun.objects.select_related("rule_set").prefetch_related(
            "screen_results__security"
        ),
        pk=pk,
    )
    return render(
        request,
        "vybcheq/staff/screen_run_detail.html",
        {"run": run},
    )


@staff_member_required
def sim_portfolio(request: HttpRequest) -> HttpResponse:
    get_or_create_cheq_account(request.user)
    acct = request.user.cheq_account
    open_positions = (
        SimPosition.objects.filter(user=request.user, closed_at__isnull=True)
        .select_related("security")
        .order_by("-opened_at")
    )
    closed_positions = (
        SimPosition.objects.filter(user=request.user, closed_at__isnull=False)
        .select_related("security")
        .order_by("-closed_at")[:15]
    )
    return render(
        request,
        "vybcheq/staff/sim_portfolio.html",
        {
            "cheq_account": acct,
            "open_positions": open_positions,
            "closed_positions": closed_positions,
            "quote_interval": int(quote_min_interval_seconds()),
        },
    )


@staff_member_required
def sim_open_trade(request: HttpRequest) -> HttpResponse:
    get_or_create_cheq_account(request.user)
    wallet = request.user.cheq_account.balance
    if request.method == "POST":
        form = SimTradeOpenForm(request.POST, wallet_balance=wallet)
        if form.is_valid():
            try:
                pos = open_position(
                    request.user,
                    form.cleaned_data["security"],
                    price_multiple=Decimal(str(form.cleaned_data["price_multiple"])),
                )
                messages.success(
                    request,
                    _("Opened %(cheqs)s cheqs on %(sym)s at cached price %(p)s (shares %(m)s).")
                    % {
                        "cheqs": pos.cheqs_opened,
                        "sym": pos.security,
                        "p": pos.entry_price,
                        "m": form.cleaned_data["price_multiple"],
                    },
                )
                return redirect("vybcheq_staff:sim_position_detail", pk=pos.pk)
            except (ValueError, YahooMetricsError) as exc:
                messages.error(request, str(exc))
    else:
        form = SimTradeOpenForm(wallet_balance=wallet)
    sim_watchlist_has_securities = Security.objects.filter(
        is_active=True,
        watchlist_entry__isnull=False,
    ).exists()
    return render(
        request,
        "vybcheq/staff/sim_open_trade.html",
        {
            "form": form,
            "balance": wallet,
            "sim_watchlist_has_securities": sim_watchlist_has_securities,
        },
    )


@staff_member_required
@require_POST
def sim_close_trade(request: HttpRequest, position_id: int) -> HttpResponse:
    try:
        pos = close_position(request.user, position_id)
        messages.success(
            request,
            _("Closed position; %(proceeds)s cheqs returned to wallet.")
            % {"proceeds": pos.cheqs_proceeds},
        )
    except SimPosition.DoesNotExist:
        messages.error(request, _("Position not found or already closed."))
    except (ValueError, YahooMetricsError) as exc:
        messages.error(request, str(exc))
    return redirect("vybcheq_staff:sim_portfolio")


@staff_member_required
@require_POST
def sim_record_marks(request: HttpRequest) -> HttpResponse:
    n, errs = record_marks_for_user_open_positions(request.user)
    if n:
        messages.success(
            request,
            _("Recorded %(n)s new mark(s). Quotes skip Yahoo if refreshed recently.")
            % {"n": n},
        )
    else:
        messages.warning(
            request,
            _("No marks recorded. Open a position or wait for a valid quote."),
        )
    for e in errs[:5]:
        messages.warning(request, e)
    if len(errs) > 5:
        messages.warning(request, _("Additional quote errors omitted."))
    return redirect("vybcheq_staff:sim_portfolio")


@staff_member_required
def sim_position_detail(request: HttpRequest, pk: int) -> HttpResponse:
    pos = get_object_or_404(
        SimPosition.objects.select_related("security").prefetch_related("marks"),
        pk=pk,
        user=request.user,
    )
    marks = list(pos.marks.all())
    return render(
        request,
        "vybcheq/staff/sim_position_detail.html",
        {"position": pos, "marks": marks},
    )
