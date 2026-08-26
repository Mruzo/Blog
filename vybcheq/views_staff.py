from decimal import Decimal

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator
from django.db.models import Count, Exists, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django.http import Http404, HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

from django.views.decorators.http import require_GET, require_POST

from .chart_data import (
    build_fiscal_chart_meta,
    build_fiscal_chart_series,
    build_sim_portfolio_chart_data,
)
from .forms import (
    BriefingThresholdForm,
    ScreeningMetricsForm,
    ScreeningRuleSetForm,
    rules_from_formset,
    screening_rule_formset,
    SimTradeOpenForm,
    SimCloseSharesForm,
)
from .fmp_client import FmpError
from .fmp_symbol_directory import (
    add_directory_entry_to_catalog,
    load_builtin_us_symbol_directory,
    merge_fmp_search_into_directory,
    sync_fmp_symbol_directory,
)
from .models import (
    FmpDirectoryMeta,
    FmpFinancialSymbol,
    ScreenRun,
    ScreeningRuleSet,
    Security,
    SecurityFiscalQuarter,
    SimPosition,
    WatchlistEntry,
)
from .money import format_money
from .rule_set_briefing import (
    BRIEFING_CATALOG,
    briefing_item,
    build_briefing_rows,
    extended_rule_sets,
    rule_sets_for_brief_slugs,
    save_briefing_check,
)
from .screening import run_composite_screen_against_watchlist, run_screen_against_watchlist
from .screening_metrics import latest_fiscal_quarter
from .sim_trading import (
    aggregate_open_positions,
    close_position,
    close_shares,
    get_or_create_cheq_account,
    open_position,
    portfolio_open_totals,
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
    all_rule_sets = list(ScreeningRuleSet.objects.all().order_by("-is_active", "name"))
    briefing_rows = build_briefing_rows(all_rule_sets)
    briefing_configured = sum(1 for r in briefing_rows if r.rule_set is not None)
    briefing_unconfigured = len(briefing_rows) - briefing_configured
    watchlist_top5 = list(
        WatchlistEntry.objects.select_related("security")
        .filter(
            security__is_active=True,
        )
        .filter(
            Q(security__quote_eod_close__isnull=False)
            | Q(security__quote_implied_close__isnull=False)
        )
        .order_by("security__quote_last_price", "priority", "security__symbol")[:5]
    )
    active_securities_cap = 300
    active_qs = Security.objects.filter(is_active=True).order_by("exchange", "symbol")
    active_securities_truncated = sec_count > active_securities_cap

    cheq_acct = get_or_create_cheq_account(request.user)
    wallet_balance = cheq_acct.balance

    open_base = SimPosition.objects.filter(user=request.user, closed_at__isnull=True)
    open_position_count = open_base.values("security_id").distinct().count()
    # Match prior Python sort: valid cached quote first (ascending by quote), else entry price.
    portfolio_top5 = aggregate_open_positions(request.user)[:5]

    chart_data = build_fiscal_chart_meta()

    return render(
        request,
        "vybcheq/staff/dashboard.html",
        {
            "watchlist_count": wl_count,
            "security_count": sec_count,
            "screen_run_rows": screen_run_rows,
            "briefing_rows": briefing_rows,
            "briefing_configured": briefing_configured,
            "briefing_unconfigured": briefing_unconfigured,
            "briefing_total": len(briefing_rows),
            "rule_set_count": len(all_rule_sets),
            "watchlist_top5": watchlist_top5,
            "active_securities_truncated": active_securities_truncated,
            "wallet_balance": wallet_balance,
            "portfolio_top5": portfolio_top5,
            "open_position_count": open_position_count,
            "chart_data": chart_data,
        },
    )


@staff_member_required
@require_GET
def fiscal_chart_series(request: HttpRequest, security_id: int) -> JsonResponse:
    if not Security.objects.filter(pk=security_id, is_active=True).exists():
        raise Http404
    return JsonResponse(build_fiscal_chart_series(security_id))


@staff_member_required
def watchlist(request: HttpRequest) -> HttpResponse:
    latest_quarter = SecurityFiscalQuarter.objects.filter(
        security_id=OuterRef("security_id"),
    ).order_by("-period_end")
    entries_qs = (
        WatchlistEntry.objects.select_related("security")
        .annotate(
            latest_period_end=Subquery(latest_quarter.values("period_end")[:1]),
            latest_report_date=Subquery(latest_quarter.values("report_date")[:1]),
        )
        .order_by("priority", "security__symbol")
    )
    page_obj = Paginator(entries_qs, 50).get_page(request.GET.get("page"))
    return render(
        request,
        "vybcheq/staff/watchlist.html",
        {"entries": page_obj, "page_obj": page_obj},
    )


@staff_member_required
def fmp_symbol_directory(request: HttpRequest) -> HttpResponse:
    meta = FmpDirectoryMeta.get_solo()

    if request.method == "POST":
        action = request.POST.get("action", "")
        if action == "sync":
            try:
                counts = sync_fmp_symbol_directory()
            except FmpError as exc:
                messages.error(request, str(exc))
                messages.info(
                    request,
                    _(
                        "Bulk FMP directories are often premium. "
                        "Try **Load built-in US catalog** (0 calls) below."
                    ),
                )
            except Exception as exc:  # noqa: BLE001
                messages.error(request, str(exc))
            else:
                messages.success(
                    request,
                    _(
                        "Synced %(total)s symbols from FMP (1 API call, %(endpoint)s): "
                        "%(us)s US major · %(foreign)s other."
                    )
                    % counts,
                )
            return redirect("vybcheq_staff:fmp_symbol_directory")

        if action == "load_builtin":
            try:
                counts = load_builtin_us_symbol_directory()
            except FmpError as exc:
                messages.error(request, str(exc))
            except Exception as exc:  # noqa: BLE001
                messages.error(request, str(exc))
            else:
                messages.success(
                    request,
                    _(
                        "Loaded %(total)s built-in US symbols (0 API calls): "
                        "%(us)s US major · %(foreign)s other."
                    )
                    % counts,
                )
            return redirect("vybcheq_staff:fmp_symbol_directory")

        if action == "search_fmp":
            query = (request.POST.get("q") or "").strip()
            try:
                counts = merge_fmp_search_into_directory(query)
            except FmpError as exc:
                messages.error(request, str(exc))
            except Exception as exc:  # noqa: BLE001
                messages.error(request, str(exc))
            else:
                messages.success(
                    request,
                    _(
                        "Merged %(stored)s match(es) from FMP search for %(q)r (1 API call). "
                        "Catalog now has %(total)s symbols."
                    )
                    % {"stored": counts["stored"], "q": query, "total": counts["total"]},
                )
            return redirect(f"{reverse('vybcheq_staff:fmp_symbol_directory')}?q={query}")

        if action == "add":
            entry = get_object_or_404(FmpFinancialSymbol, pk=request.POST.get("entry_id"))
            security, catalog_changed, watchlist_created = add_directory_entry_to_catalog(entry)
            if watchlist_created:
                messages.success(
                    request,
                    _("Added %(sym)s to catalog and watchlist.") % {"sym": security},
                )
            elif catalog_changed:
                messages.success(request, _("Updated catalog entry for %(sym)s.") % {"sym": security})
            else:
                messages.info(request, _("%(sym)s is already on your watchlist.") % {"sym": security})
            return redirect("vybcheq_staff:fmp_symbol_directory")

    us_only = request.GET.get("us", "1") != "0"
    exchange = (request.GET.get("exchange") or "").strip().upper()
    query = (request.GET.get("q") or "").strip()

    qs = FmpFinancialSymbol.objects.all()
    if us_only:
        qs = qs.filter(is_us_major=True)
    if exchange:
        qs = qs.filter(exchange=exchange)
    if query:
        qs = qs.filter(
            Q(symbol__icontains=query)
            | Q(fmp_symbol__icontains=query)
            | Q(name__icontains=query)
        )

    qs = qs.annotate(
        in_catalog=Exists(
            Security.objects.filter(
                symbol=OuterRef("symbol"),
                exchange=OuterRef("exchange"),
            )
        ),
        on_watchlist=Exists(
            WatchlistEntry.objects.filter(
                security__symbol=OuterRef("symbol"),
                security__exchange=OuterRef("exchange"),
            )
        ),
    ).order_by("exchange", "symbol")

    paginator = Paginator(qs, 50)
    page_obj = paginator.get_page(request.GET.get("page"))

    exchange_choices = (
        FmpFinancialSymbol.objects.filter(is_us_major=True)
        .values_list("exchange", flat=True)
        .distinct()
        .order_by("exchange")
    )

    return render(
        request,
        "vybcheq/staff/fmp_symbol_directory.html",
        {
            "meta": meta,
            "page_obj": page_obj,
            "query": query,
            "us_only": us_only,
            "exchange": exchange,
            "exchange_choices": exchange_choices,
            "total_filtered": paginator.count,
        },
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
    latest_quarter = latest_fiscal_quarter(security)
    return render(
        request,
        "vybcheq/staff/security_metrics.html",
        {"security": security, "form": form, "latest_quarter": latest_quarter},
    )


@staff_member_required
def rule_set_list(request: HttpRequest) -> HttpResponse:
    rule_sets = list(ScreeningRuleSet.objects.all().order_by("-is_active", "name"))
    rows = build_briefing_rows(rule_sets)
    configured = sum(1 for r in rows if r.rule_set is not None)
    watchlist_count = WatchlistEntry.objects.count()
    threshold_forms = {}
    for row in rows:
        rule = row.effective_rules[0] if row.effective_rules else row.suggested_rule
        threshold_forms[row.slug] = BriefingThresholdForm(initial={"value": rule.get("value")})
    briefing_table = [(row, threshold_forms[row.slug]) for row in rows]
    page_stats = [
        {
            "label": "Checks saved",
            "value": f"{configured} / {len(rows)}",
            "tone": "success" if configured == len(rows) else "warning",
        },
        {
            "label": "Watchlist",
            "value": str(watchlist_count),
            "tone": "neutral",
        },
    ]
    return render(
        request,
        "vybcheq/staff/rule_sets.html",
        {
            "rule_sets": rule_sets,
            "briefing_rows": rows,
            "briefing_table": briefing_table,
            "page_stats": page_stats,
            "briefing_configured": configured,
            "briefing_total": len(rows),
            "watchlist_count": watchlist_count,
            "extended_rule_sets": extended_rule_sets(rule_sets, rows),
            "threshold_forms": threshold_forms,
            "saved_briefing_count": configured,
        },
    )


@staff_member_required
@require_POST
def rule_set_save_brief(request: HttpRequest, slug: str) -> HttpResponse:
    item = briefing_item(slug)
    if item is None:
        return redirect("vybcheq_staff:rule_set_list")

    form = BriefingThresholdForm(request.POST)
    if form.is_valid():
        save_briefing_check(slug, form.cleaned_data["value"])
        messages.success(
            request,
            _("Saved %(title)s threshold.") % {"title": item["title"]},
        )
    else:
        messages.error(request, _("Enter a valid threshold value."))
    return redirect(reverse("vybcheq_staff:rule_set_list") + f"#brief-{slug}")


@staff_member_required
@require_POST
def run_screen_composite(request: HttpRequest) -> HttpResponse:
    slugs = request.POST.getlist("slugs")
    selected = rule_sets_for_brief_slugs(slugs)
    if not selected:
        messages.warning(request, _("Select at least one saved check to run."))
        return redirect("vybcheq_staff:rule_set_list")

    run = run_composite_screen_against_watchlist(selected)
    if run.status == ScreenRun.Status.FAILED:
        messages.error(
            request,
            _("Portfolio bar run failed: %(err)s") % {"err": run.error_message},
        )
        return redirect("vybcheq_staff:screen_runs")

    stats = run.screen_results.aggregate(
        total=Count("id"),
        passed=Count("id", filter=Q(passed=True)),
    )
    n = stats["total"] or 0
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
            _("Portfolio bar complete: %(passed)s of %(n)s passed.")
            % {"passed": stats["passed"], "n": n},
        )
    return redirect("vybcheq_staff:screen_run_detail", pk=run.pk)


@staff_member_required
def rule_set_create(request: HttpRequest) -> HttpResponse:
    return _rule_set_edit(request, rule_set=None)


@staff_member_required
def rule_set_edit(request: HttpRequest, pk: int) -> HttpResponse:
    rule_set = get_object_or_404(ScreeningRuleSet, pk=pk)
    return _rule_set_edit(request, rule_set=rule_set)


def _brief_item(slug: str) -> dict | None:
    return briefing_item(slug)


def _rule_set_edit(
    request: HttpRequest,
    *,
    rule_set: ScreeningRuleSet | None,
) -> HttpResponse:
    existing_rules = list(rule_set.rules or []) if rule_set else []
    extra = max(1, 6 - len(existing_rules))
    FormSet = screening_rule_formset(extra=extra)

    brief_slug = (request.GET.get("brief") or "").strip() if rule_set is None else ""
    brief_item = _brief_item(brief_slug) if brief_slug else None
    brief_prefill = brief_item is not None and request.method == "GET"

    if request.method == "POST":
        form = ScreeningRuleSetForm(request.POST, instance=rule_set)
        formset = FormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            obj = form.save(commit=False)
            obj.rules = rules_from_formset(formset)
            if brief_item and rule_set is None:
                obj.brief_slug = brief_item["slug"]
            obj.save()
            messages.success(
                request,
                _("Saved rule set “%(name)s”.") % {"name": obj.name},
            )
            return redirect("vybcheq_staff:rule_set_list")
    else:
        form = ScreeningRuleSetForm(instance=rule_set)
        if brief_prefill and brief_item:
            form.initial.setdefault("name", brief_item["title"])
        initial = existing_rules
        if not initial and brief_prefill and brief_item:
            initial = [brief_item["suggested_rule"]]
        formset = FormSet(initial=initial)

    return render(
        request,
        "vybcheq/staff/rule_set_form.html",
        {
            "form": form,
            "formset": formset,
            "rule_set": rule_set,
            "is_create": rule_set is None,
            "brief_item": brief_item if brief_prefill else None,
        },
    )


@staff_member_required
def run_screen_pick(request: HttpRequest) -> HttpResponse:
    rule_sets = list(ScreeningRuleSet.objects.all().order_by("name"))
    rows = build_briefing_rows(rule_sets)
    saved_rows = [row for row in rows if row.rule_set is not None]
    custom_rule_sets = extended_rule_sets(rule_sets, rows)
    return render(
        request,
        "vybcheq/staff/run_screen_pick.html",
        {
            "briefing_rows": saved_rows,
            "custom_rule_sets": custom_rule_sets,
            "has_saved_checks": bool(saved_rows),
        },
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
    open_positions = aggregate_open_positions(request.user)
    portfolio_totals = portfolio_open_totals(open_positions)
    portfolio_chart = build_sim_portfolio_chart_data(
        request.user, open_totals=portfolio_totals
    )
    trade_history = (
        SimPosition.objects.filter(user=request.user)
        .select_related("security", "parent_position")
        .order_by(Coalesce("closed_at", "opened_at").desc())[:25]
    )
    return render(
        request,
        "vybcheq/staff/sim_portfolio.html",
        {
            "cheq_account": acct,
            "open_positions": open_positions,
            "portfolio_totals": portfolio_totals,
            "portfolio_chart": portfolio_chart,
            "trade_history": trade_history,
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
                        "cheqs": format_money(pos.cheqs_opened),
                        "sym": pos.security,
                        "p": format_money(pos.entry_price),
                        "m": form.cleaned_data["price_multiple"],
                    },
                )
                return redirect("vybcheq_staff:sim_position_detail", pk=pos.pk)
            except ValueError as exc:
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
def sim_close_security(request: HttpRequest, security_id: int) -> HttpResponse:
    security = get_object_or_404(Security, pk=security_id)
    row = next(
        (r for r in aggregate_open_positions(request.user) if r.security.pk == security.pk),
        None,
    )
    if row is None:
        messages.error(request, _("No open position for %(sym)s.") % {"sym": security})
        return redirect("vybcheq_staff:sim_portfolio")

    form = SimCloseSharesForm(
        request.POST,
        max_shares=row.shares,
        quote_price=security.quote_last_price,
    )
    if not form.is_valid():
        for errs in form.errors.values():
            for err in errs:
                messages.error(request, err)
        return redirect("vybcheq_staff:sim_portfolio")

    try:
        result = close_shares(request.user, security, form.cleaned_data["shares"])
        messages.success(
            request,
            _(
                "Sold %(shares)s share(s) of %(sym)s at %(price)s; "
                "%(proceeds)s cheqs returned to wallet."
            )
            % {
                "shares": result.shares_sold.normalize(),
                "sym": security.symbol,
                "price": format_money(result.exit_price),
                "proceeds": format_money(result.total_proceeds),
            },
        )
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("vybcheq_staff:sim_portfolio")


@staff_member_required
def sim_security_lots(request: HttpRequest, security_id: int) -> HttpResponse:
    security = get_object_or_404(Security, pk=security_id)
    lots = (
        SimPosition.objects.filter(user=request.user, security=security)
        .order_by("-opened_at")
    )
    return render(
        request,
        "vybcheq/staff/sim_security_lots.html",
        {"security": security, "lots": lots},
    )


@staff_member_required
@require_POST
def sim_close_trade(request: HttpRequest, position_id: int) -> HttpResponse:
    try:
        pos = close_position(request.user, position_id)
        messages.success(
            request,
            _("Closed position; %(proceeds)s cheqs returned to wallet.")
            % {"proceeds": format_money(pos.cheqs_proceeds)},
        )
    except SimPosition.DoesNotExist:
        messages.error(request, _("Position not found or already closed."))
    except ValueError as exc:
        messages.error(request, str(exc))
    return redirect("vybcheq_staff:sim_portfolio")


@staff_member_required
@require_POST
def sim_record_marks(request: HttpRequest) -> HttpResponse:
    n, errs = record_marks_for_user_open_positions(request.user)
    if n:
        messages.success(
            request,
            _("Recorded %(n)s new mark(s) from cached quotes.") % {"n": n},
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
