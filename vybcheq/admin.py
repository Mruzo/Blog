from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path
from django.utils.html import escape, format_html
from django.utils.translation import gettext_lazy as _

from .models import (
    CheqAccount,
    DecisionLog,
    FmpDirectoryMeta,
    FmpFinancialSymbol,
    PositionMark,
    ResearchPacket,
    ScreenResult,
    ScreenRun,
    ScreeningRuleSet,
    Security,
    SecurityDailyQuote,
    SecurityFiscalQuarter,
    SimPosition,
    WatchlistEntry,
)
import time

import requests

from .fmp_client import FmpError, fmp_action_gap_seconds
from .fmp_eod import sync_security_eod_from_fmp
from .fmp_fundamentals import merge_screening_metrics_from_fmp
from .fmp_report_dates import merge_report_dates_from_fmp
from .fmp_symbol_directory import sync_fmp_symbol_directory
from .market_symbols import MarketSymbolError
from .screening import run_screen_against_watchlist


def _details_as_html(obj: ScreenResult | None) -> str:
    if obj is None or not obj.details:
        return "—"
    blocks = []
    for line in obj.details.splitlines():
        line = line.strip()
        if not line:
            continue
        if "→ FAIL" in line or "-> FAIL" in line:
            border = "#dc3545"
            color = "#f8d7da"
        elif "→ PASS" in line or "-> PASS" in line:
            border = "#198754"
            color = "#d1e7dd"
        else:
            border = "#6c757d"
            color = "#e9ecef"
        blocks.append(
            f'<div style="margin:0.4em 0;padding:0.35em 0.5em 0.35em 0.65em;'
            f"border-left:3px solid {border};background:{color};color:#212529;"
            f'font-size:12px;line-height:1.35;">{escape(line)}</div>'
        )
    return format_html("".join(blocks)) if blocks else "—"


@admin.action(
    description=_("FMP: refresh quarterly fundamentals + implied price (3 API calls per security)")
)
def fmp_refresh_screening_metrics(modeladmin, request, queryset):
    securities = list(queryset)
    n = len(securities)
    if n:
        modeladmin.message_user(
            request,
            _(
                "Quarterly fundamentals (ratios + key-metrics + financial-growth) uses "
                "%(calls)s FMP API call(s) (up to 3× per security)."
            )
            % {"calls": n * 3},
            level=messages.INFO,
        )
    session = requests.Session()
    gap = fmp_action_gap_seconds()
    updated = 0
    for i, sec in enumerate(securities):
        if i > 0:
            time.sleep(gap)
        try:
            merge_screening_metrics_from_fmp(sec, session=session)
            updated += 1
        except (FmpError, MarketSymbolError) as exc:
            modeladmin.message_user(
                request,
                _("%(sec)s: %(err)s") % {"sec": sec, "err": exc},
                level=messages.ERROR,
            )
        except Exception as exc:  # noqa: BLE001 — show network/parsing errors in admin
            modeladmin.message_user(
                request,
                _("%(sec)s: %(err)s") % {"sec": sec, "err": exc},
                level=messages.ERROR,
            )
    if updated:
        modeladmin.message_user(
            request,
            _(
                "Stored quarterly fundamentals and implied valuation price for %(n)s security(ies). "
                "EOD market close (if already loaded) is kept for sim marks."
            )
            % {"n": updated},
            level=messages.SUCCESS,
        )


@admin.action(
    description=_("FMP: refresh financial report filing dates (1 API call per security)")
)
def fmp_refresh_report_dates(modeladmin, request, queryset):
    securities = list(queryset)
    n = len(securities)
    if n:
        modeladmin.message_user(
            request,
            _("Financial report dates uses %(calls)s FMP API call(s) (1× per security).")
            % {"calls": n},
            level=messages.INFO,
        )
    session = requests.Session()
    gap = fmp_action_gap_seconds()
    updated = 0
    for i, sec in enumerate(securities):
        if i > 0:
            time.sleep(gap)
        try:
            merge_report_dates_from_fmp(sec, session=session)
            updated += 1
        except (FmpError, MarketSymbolError) as exc:
            modeladmin.message_user(
                request,
                _("%(sec)s: %(err)s") % {"sec": sec, "err": exc},
                level=messages.ERROR,
            )
        except Exception as exc:  # noqa: BLE001 — show network/parsing errors in admin
            modeladmin.message_user(
                request,
                _("%(sec)s: %(err)s") % {"sec": sec, "err": exc},
                level=messages.ERROR,
            )
    if updated:
        modeladmin.message_user(
            request,
            _("Stored report filing dates for %(n)s security(ies).") % {"n": updated},
            level=messages.SUCCESS,
        )


@admin.action(
    description=_("FMP: refresh EOD market close + quarter-end prices (1 API call per security)")
)
def fmp_refresh_eod_quotes(modeladmin, request, queryset):
    securities = list(queryset)
    n = len(securities)
    if n:
        modeladmin.message_user(
            request,
            _("EOD market prices uses %(calls)s FMP API call(s) (1× per security).")
            % {"calls": n},
            level=messages.INFO,
        )
    session = requests.Session()
    gap = fmp_action_gap_seconds()
    updated = 0
    for i, sec in enumerate(securities):
        if i > 0:
            time.sleep(gap)
        try:
            result = sync_security_eod_from_fmp(sec, session=session, update_cached_quote=True)
            if result is None:
                modeladmin.message_user(
                    request,
                    _("%(sec)s: no EOD bars stored.") % {"sec": sec},
                    level=messages.WARNING,
                )
                continue
            updated += 1
        except (FmpError, MarketSymbolError) as exc:
            modeladmin.message_user(
                request,
                _("%(sec)s: %(err)s") % {"sec": sec, "err": exc},
                level=messages.ERROR,
            )
        except Exception as exc:  # noqa: BLE001 — show network/parsing errors in admin
            modeladmin.message_user(
                request,
                _("%(sec)s: %(err)s") % {"sec": sec, "err": exc},
                level=messages.ERROR,
            )
    if updated:
        modeladmin.message_user(
            request,
            _(
                "Stored EOD market close (trade date on each security) and quarter-end "
                "historical closes for %(n)s security(ies)."
            )
            % {"n": updated},
            level=messages.SUCCESS,
        )


@admin.register(Security)
class SecurityAdmin(admin.ModelAdmin):
    list_display = (
        "symbol",
        "exchange",
        "name",
        "quote_eod_display",
        "quote_implied_display",
        "quote_mark_display",
        "last_report_date",
        "sector",
        "currency",
        "is_active",
    )
    list_filter = ("exchange", "is_active", "sector")
    search_fields = ("symbol", "name", "cik")
    actions = [fmp_refresh_eod_quotes, fmp_refresh_screening_metrics, fmp_refresh_report_dates]
    readonly_fields = (
        "quote_eod_close",
        "quote_eod_trade_date",
        "quote_eod_refreshed_at",
        "quote_implied_close",
        "quote_implied_period_end",
        "quote_implied_method",
        "quote_implied_period_mode",
        "quote_implied_refreshed_at",
        "quote_last_price",
        "quote_mark_source",
        "quote_updated_at",
    )

    @admin.display(description=_("EOD close"))
    def quote_eod_display(self, obj: Security) -> str:
        if obj.quote_eod_close is None:
            return "—"
        trade = obj.quote_eod_trade_date.isoformat() if obj.quote_eod_trade_date else "?"
        return f"{obj.quote_eod_close} · trade {trade}"

    @admin.display(description=_("Implied"))
    def quote_implied_display(self, obj: Security) -> str:
        if obj.quote_implied_close is None:
            return "—"
        period = obj.quote_implied_period_end.isoformat() if obj.quote_implied_period_end else "?"
        mode = obj.quote_implied_period_mode or "?"
        return f"{obj.quote_implied_close} · period {period} · {mode}"

    @admin.display(description=_("Sim mark"))
    def quote_mark_display(self, obj: Security) -> str:
        if obj.quote_last_price is None:
            return "—"
        src = obj.quote_mark_source or "?"
        return f"{obj.quote_last_price} ({src})"


@admin.register(FmpFinancialSymbol)
class FmpFinancialSymbolAdmin(admin.ModelAdmin):
    change_list_template = "admin/vybcheq/fmpfinancialsymbol/change_list.html"
    list_display = (
        "symbol",
        "exchange",
        "fmp_symbol",
        "name",
        "currency",
        "is_us_major",
        "symbol_type",
        "updated_at",
    )
    list_filter = ("is_us_major", "exchange", "currency", "symbol_type")
    search_fields = ("symbol", "fmp_symbol", "name", "exchange")
    readonly_fields = (
        "fmp_symbol",
        "symbol",
        "exchange",
        "name",
        "currency",
        "exchange_short_name",
        "exchange_full_name",
        "country",
        "symbol_type",
        "is_us_major",
        "raw",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_urls(self):
        info = self.model._meta.app_label, self.model._meta.model_name
        urls = super().get_urls()
        custom = [
            path(
                "sync-from-fmp/",
                self.admin_site.admin_view(self.sync_from_fmp_view),
                name="%s_%s_sync_from_fmp" % info,
            ),
        ]
        return custom + urls

    def sync_from_fmp_view(self, request):
        if not self.has_view_permission(request):
            raise PermissionDenied
        if request.method == "POST":
            try:
                counts = sync_fmp_symbol_directory()
            except FmpError as exc:
                messages.error(request, str(exc))
            except Exception as exc:  # noqa: BLE001
                messages.error(request, str(exc))
            else:
                messages.success(
                    request,
                    _(
                        "Synced %(total)s symbols from FMP (1 API call, %(endpoint)s): "
                        "%(us)s US major · %(foreign)s other exchanges."
                    )
                    % counts,
                )
        return redirect("admin:vybcheq_fmpfinancialsymbol_changelist")

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["fmp_directory_meta"] = FmpDirectoryMeta.get_solo()
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(FmpDirectoryMeta)
class FmpDirectoryMetaAdmin(admin.ModelAdmin):
    list_display = ("synced_at", "total_count", "us_count", "foreign_count", "endpoint")
    readonly_fields = ("synced_at", "total_count", "us_count", "foreign_count", "endpoint")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SecurityFiscalQuarter)
class SecurityFiscalQuarterAdmin(admin.ModelAdmin):
    list_display = ("security", "period_end", "report_date", "eod_trade_date", "close", "implied_close", "source")
    list_select_related = ("security",)
    list_filter = ("source", "period_end")
    search_fields = ("security__symbol", "security__exchange")
    date_hierarchy = "period_end"
    ordering = ("-period_end", "security__symbol")


@admin.register(SecurityDailyQuote)
class SecurityDailyQuoteAdmin(admin.ModelAdmin):
    list_display = ("security", "trade_date", "close", "volume", "source")
    list_select_related = ("security",)
    list_filter = ("source", "trade_date")
    search_fields = ("security__symbol", "security__exchange")
    date_hierarchy = "trade_date"
    ordering = ("-trade_date", "security__symbol")


@admin.register(WatchlistEntry)
class WatchlistEntryAdmin(admin.ModelAdmin):
    list_display = ("security", "priority", "last_reviewed_at", "added_at")
    list_select_related = ("security",)
    list_filter = ("priority",)
    search_fields = ("security__symbol", "security__name", "note")
    autocomplete_fields = ("security",)


@admin.register(ScreeningRuleSet)
class ScreeningRuleSetAdmin(admin.ModelAdmin):
    change_form_template = "admin/vybcheq/screeningruleset/change_form.html"
    list_display = ("name", "brief_slug", "is_active", "created_at")
    list_filter = ("is_active",)

    def get_urls(self):
        info = self.model._meta.app_label, self.model._meta.model_name
        urls = super().get_urls()
        custom = [
            path(
                "run-screen/<int:pk>/",
                self.admin_site.admin_view(self.run_screen_view),
                name="%s_%s_run_screen" % info,
            ),
        ]
        return custom + urls

    def run_screen_view(self, request, pk):
        rule_set = get_object_or_404(ScreeningRuleSet, pk=pk)
        if not self.has_change_permission(request, rule_set):
            raise PermissionDenied

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
                            "Screen run %(id)s finished, but no securities were evaluated. "
                            "Create a Watch list entry for each ticker (Vybcheq → Watch list entries); "
                            "saving a Security alone does not put it in the screen universe."
                        )
                        % {"id": run.pk},
                    )
                else:
                    messages.success(
                        request,
                        _("Screen run %(id)s finished (%(n)s securities).")
                        % {"id": run.pk, "n": n},
                    )
            return redirect("admin:vybcheq_screenrun_change", run.pk)

        context = {
            **self.admin_site.each_context(request),
            "title": _("Run screen"),
            "rule_set": rule_set,
            "opts": self.model._meta,
            "has_view_permission": self.has_view_permission(request, rule_set),
            "has_change_permission": self.has_change_permission(request, rule_set),
        }
        return render(
            request,
            "admin/vybcheq/screeningruleset/run_screen_confirmation.html",
            context,
        )


class ScreenResultInline(admin.TabularInline):
    model = ScreenResult
    extra = 0
    readonly_fields = ("security", "passed", "score", "metrics_snapshot", "details_readable")
    can_delete = False

    @admin.display(description=_("Details"))
    def details_readable(self, obj):
        return _details_as_html(obj)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ScreenRun)
class ScreenRunAdmin(admin.ModelAdmin):
    change_form_template = "admin/vybcheq/screenrun/change_form.html"
    list_display = ("id", "rule_set", "status", "started_at", "finished_at", "universe_note")
    list_select_related = ("rule_set",)
    list_filter = ("status", "rule_set")
    readonly_fields = ("started_at", "finished_at")
    inlines = [ScreenResultInline]


@admin.register(ScreenResult)
class ScreenResultAdmin(admin.ModelAdmin):
    list_display = ("run", "security", "passed", "score")
    list_select_related = ("run", "security", "run__rule_set")
    list_filter = ("passed", "run")
    search_fields = ("security__symbol",)
    readonly_fields = ("run", "security", "passed", "score", "metrics_snapshot", "details_readable")

    @admin.display(description=_("Details"))
    def details_readable(self, obj):
        return _details_as_html(obj)

    def has_add_permission(self, request):
        return False


@admin.register(ResearchPacket)
class ResearchPacketAdmin(admin.ModelAdmin):
    list_display = ("security", "updated_at")
    list_select_related = ("security",)
    search_fields = ("security__symbol", "security__name")
    autocomplete_fields = ("security",)


@admin.register(DecisionLog)
class DecisionLogAdmin(admin.ModelAdmin):
    list_display = ("decided_at", "security", "action", "thesis_preview")
    list_select_related = ("security",)
    list_filter = ("action",)
    search_fields = ("security__symbol", "thesis", "risk")
    autocomplete_fields = ("security",)
    date_hierarchy = "decided_at"

    @admin.display(description="Thesis (preview)")
    def thesis_preview(self, obj):
        t = (obj.thesis or "").strip()
        return (t[:60] + "…") if len(t) > 60 else t


@admin.register(CheqAccount)
class CheqAccountAdmin(admin.ModelAdmin):
    list_display = ("user", "balance")
    search_fields = ("user__username",)


class PositionMarkInline(admin.TabularInline):
    model = PositionMark
    extra = 0
    readonly_fields = ("marked_at", "price", "value_cheqs")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(SimPosition)
class SimPositionAdmin(admin.ModelAdmin):
    list_display = ("user", "security", "cheqs_opened", "opened_at", "closed_at")
    list_select_related = ("user", "security")
    list_filter = ("closed_at",)
    search_fields = ("user__username", "security__symbol")
    readonly_fields = ("opened_at",)
    inlines = [PositionMarkInline]
    autocomplete_fields = ("user", "security")


@admin.register(PositionMark)
class PositionMarkAdmin(admin.ModelAdmin):
    list_display = ("position", "marked_at", "price", "value_cheqs")
    list_select_related = ("position", "position__security", "position__user")
    list_filter = ("marked_at",)
