from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path
from django.utils.html import escape, format_html
from django.utils.translation import gettext_lazy as _

from .models import (
    DecisionLog,
    ResearchPacket,
    ScreenResult,
    ScreenRun,
    ScreeningRuleSet,
    Security,
    WatchlistEntry,
)
import time

from .screening import run_screen_against_watchlist
from .yahoo_metrics import (
    YahooMetricsError,
    build_yahoo_finance_session,
    fetch_screening_metrics_yahoo,
    yahoo_action_gap_seconds,
)


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


@admin.action(description=_("Merge screening metrics from Yahoo Finance (yfinance)"))
def fetch_yahoo_screening_metrics(modeladmin, request, queryset):
    updated = 0
    session = build_yahoo_finance_session()
    gap = yahoo_action_gap_seconds()
    for i, sec in enumerate(queryset):
        if i > 0:
            time.sleep(gap)
        try:
            fetched = fetch_screening_metrics_yahoo(sec, session=session)
            sec.screening_metrics = {**(sec.screening_metrics or {}), **fetched}
            sec.save(update_fields=["screening_metrics"])
            updated += 1
        except YahooMetricsError as exc:
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
            _("Updated screening metrics for %(n)s security(ies).") % {"n": updated},
            level=messages.SUCCESS,
        )


@admin.register(Security)
class SecurityAdmin(admin.ModelAdmin):
    list_display = ("symbol", "exchange", "name", "sector", "currency", "is_active")
    list_filter = ("exchange", "is_active", "sector")
    search_fields = ("symbol", "name", "cik")
    actions = [fetch_yahoo_screening_metrics]


@admin.register(WatchlistEntry)
class WatchlistEntryAdmin(admin.ModelAdmin):
    list_display = ("security", "priority", "last_reviewed_at", "added_at")
    list_filter = ("priority",)
    search_fields = ("security__symbol", "security__name", "note")
    autocomplete_fields = ("security",)


@admin.register(ScreeningRuleSet)
class ScreeningRuleSetAdmin(admin.ModelAdmin):
    change_form_template = "admin/vybcheq/screeningruleset/change_form.html"
    list_display = ("name", "is_active", "created_at")
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
    list_filter = ("status", "rule_set")
    readonly_fields = ("started_at", "finished_at")
    inlines = [ScreenResultInline]


@admin.register(ScreenResult)
class ScreenResultAdmin(admin.ModelAdmin):
    list_display = ("run", "security", "passed", "score")
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
    search_fields = ("security__symbol", "security__name")
    autocomplete_fields = ("security",)


@admin.register(DecisionLog)
class DecisionLogAdmin(admin.ModelAdmin):
    list_display = ("decided_at", "security", "action", "thesis_preview")
    list_filter = ("action",)
    search_fields = ("security__symbol", "thesis", "risk")
    autocomplete_fields = ("security",)
    date_hierarchy = "decided_at"

    @admin.display(description="Thesis (preview)")
    def thesis_preview(self, obj):
        t = (obj.thesis or "").strip()
        return (t[:60] + "…") if len(t) > 60 else t
