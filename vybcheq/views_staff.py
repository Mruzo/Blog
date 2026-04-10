from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext_lazy as _

from .forms import ScreeningMetricsForm
from .models import ScreenRun, ScreeningRuleSet, Security, WatchlistEntry
from .screening import run_screen_against_watchlist


@staff_member_required
def dashboard(request: HttpRequest) -> HttpResponse:
    wl_count = WatchlistEntry.objects.count()
    sec_count = Security.objects.filter(is_active=True).count()
    last_run = ScreenRun.objects.first()
    rule_sets = ScreeningRuleSet.objects.all()[:10]
    return render(
        request,
        "vybcheq/staff/dashboard.html",
        {
            "watchlist_count": wl_count,
            "security_count": sec_count,
            "last_run": last_run,
            "rule_sets": rule_sets,
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
