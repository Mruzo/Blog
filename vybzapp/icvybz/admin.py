from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import (
    Comic, Season, Episode, Character, POV, Dialogue, ComicComment,
    Intersection, Studio, StudioCollaborator, StudioCollaborationRequest,
    AdvertiserProfile, AdCampaign, AdCreative, AdPlacement, AdEvent,
    AdRevenueSplitConfig, AdRevenueShareSnapshot
)
from django.db import models
from tinymce.widgets import TinyMCE
from django import forms
from django.http import JsonResponse
from django.urls import path, reverse
from django.utils.html import format_html



class ComicInline(admin.TabularInline):
    model = Comic
    extra = 1


class SeasonInline(admin.TabularInline):
    model = Season
    extra = 1


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 1


class DialogueInline(admin.StackedInline):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE(attrs={'style': 'height:100px;',})},
    }
    model = Dialogue
    extra = 1

    exclude = ('scene_title', 'scene_description')


@admin.register(Comic)
class ComicAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_public', 'moderation_status', 'created_at')
    list_filter = ('is_public', 'moderation_status', 'created_at')
    list_editable = ('is_public', 'moderation_status')
    search_fields = ('title', 'user__username')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [SeasonInline]


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('title', 'comic', 'release_date')
    list_filter = ('comic',)
    inlines = [EpisodeInline]
    search_fields = ('title',)
    ordering = ('comic', 'release_date')


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ('title', 'comic', 'season', 'episode_number', 'view_count', 'last_viewed', 'is_published')
    list_filter = ('season', 'is_published', 'season__comic')
    list_editable = ('is_published',)
    inlines = [DialogueInline]
    search_fields = ('title', 'season__comic__title')
    ordering = ('season', 'episode_number')
    readonly_fields = ('view_count', 'last_viewed')
    fields = ('title', 'season', 'episode_number', 'description', 'cover_image', 'is_published', 'summary', 'summary_camera_orbit', 'summary_field_of_view', 'view_count', 'last_viewed')
    
    def comic(self, obj):
        """Return the comic title for this episode"""
        if obj.season and obj.season.comic:
            return obj.season.comic.title
        return '-'
    comic.short_description = 'Comic'
    comic.admin_order_field = 'season__comic__title'
    
    # preview_link method commented out - immersivecomics namespace removed
    # def preview_link(self, obj):
    #     if obj.pk:
    #         return format_html('<a href="{}" target="_blank">Preview/Edit</a>', 
    #                          reverse('immersivecomics:episode_preview', args=[obj.season.id, obj.pk]))
    #     return "N/A"
    # preview_link.short_description = 'Preview/Edit'


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'personality', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    list_editable = ('is_public',)
    search_fields = ('name', 'user__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(POV)
class POVAdmin(admin.ModelAdmin):
    list_display = ('title', 'character', 'head_x', 'head_y', 'head_z', 'default_camera_target')
    list_filter = ('character',)
    search_fields = ('character__name',)
    fields = ('title', 'character', 'head_x', 'head_y', 'head_z', 'default_camera_target')


@admin.register(Dialogue)
class DialogueAdmin(admin.ModelAdmin):
    list_display = ('comic', 'episode_display', 'character', 'order', 'text', 'camera_target', 'camera_orbit', 'shot_type')
    list_filter = ('episode__season__comic', 'character', 'shot_type', 'episode')
    search_fields = ('text', 'character__name', 'episode__season__comic__title')
    ordering = ('episode__season__comic__title', 'episode__season__season_number', 'episode__episode_number', 'order')

    formfield_overrides = {
        models.TextField: {'widget': TinyMCE(attrs={'style': 'height:10px;',})},
    }

    exclude = ('scene_title', 'scene_description')

    def comic(self, obj):
        """Return the comic (story) title for this dialogue"""
        if obj.episode and obj.episode.season and obj.episode.season.comic:
            return obj.episode.season.comic.title
        return '-'
    comic.short_description = 'Story'
    comic.admin_order_field = 'episode__season__comic__title'

    def episode_display(self, obj):
        """Show season/episode with story context (e.g. S1 E1) so rows aren't ambiguous."""
        if not obj.episode:
            return '-'
        s = obj.episode.season
        return f"S{s.season_number} E{obj.episode.episode_number}"
    episode_display.short_description = 'Episode'
    episode_display.admin_order_field = 'episode__episode_number'


@admin.register(Intersection)
class IntersectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    list_editable = ('is_public',)
    search_fields = ('name', 'user__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ComicComment)
class ComicCommentAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'episode', 'comment_date', 'approved_comment')
    list_filter = ('approved_comment', 'comment_date')
    search_fields = ('comment_cont', 'user_name__username', 'episode__title')
    list_editable = ('approved_comment',)
    date_hierarchy = 'comment_date'
    ordering = ('-comment_date',)


class StudioCollaboratorInline(admin.TabularInline):
    model = StudioCollaborator
    extra = 1
    fields = ('user', 'role', 'is_active', 'joined_at', 'removed_at')
    readonly_fields = ('joined_at', 'removed_at')


@admin.register(Studio)
class StudioAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'is_public', 'collaborators_count', 'created_at', 'updated_at')
    list_filter = ('is_public', 'created_at', 'updated_at')
    list_editable = ('is_public',)
    search_fields = ('name', 'description', 'owner__username', 'owner__first_name', 'owner__last_name')
    readonly_fields = ('created_at', 'updated_at', 'collaborators_count')
    fields = ('name', 'description', 'owner', 'is_public', 'avatar_url', 'created_at', 'updated_at', 'collaborators_count')
    inlines = [StudioCollaboratorInline]
    
    def collaborators_count(self, obj):
        return obj.collaborators.filter(is_active=True).count()
    collaborators_count.short_description = 'Active Collaborators'


@admin.register(StudioCollaborator)
class StudioCollaboratorAdmin(admin.ModelAdmin):
    list_display = ('studio', 'user', 'role', 'is_active', 'joined_at', 'removed_at')
    list_filter = ('studio', 'role', 'is_active', 'joined_at', 'removed_at')
    list_editable = ('is_active',)
    search_fields = ('studio__name', 'user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('joined_at', 'removed_at')
    fields = ('studio', 'user', 'role', 'is_active', 'joined_at', 'removed_at')
    date_hierarchy = 'joined_at'


@admin.register(StudioCollaborationRequest)
class StudioCollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ('studio', 'requester', 'role', 'status', 'created_at', 'updated_at')
    list_filter = ('studio', 'role', 'status', 'created_at', 'updated_at')
    list_editable = ('status',)
    search_fields = ('studio__name', 'requester__username', 'requester__first_name', 'requester__last_name', 'message')
    readonly_fields = ('created_at', 'updated_at')
    fields = ('studio', 'requester', 'role', 'status', 'message', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)


@admin.register(AdvertiserProfile)
class AdvertiserProfileAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'contact_email', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    list_editable = ('status',)
    search_fields = ('business_name', 'contact_name', 'contact_email', 'user__username')
    readonly_fields = ('created_at', 'updated_at')


class AdCreativeInline(admin.TabularInline):
    model = AdCreative
    extra = 0
    fields = ('title', 'image', 'destination_url', 'status', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(AdCampaign)
class AdCampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'advertiser', 'is_active', 'start_date', 'end_date', 'created_at')
    list_filter = ('is_active', 'start_date', 'end_date', 'advertiser__status')
    list_editable = ('is_active',)
    search_fields = ('name', 'advertiser__business_name')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [AdCreativeInline]


@admin.register(AdCreative)
class AdCreativeAdmin(admin.ModelAdmin):
    list_display = ('title', 'advertiser', 'campaign', 'status', 'created_at')
    list_filter = ('status', 'advertiser__status', 'created_at')
    list_editable = ('status',)
    search_fields = ('title', 'advertiser__business_name', 'destination_url')
    readonly_fields = ('created_at', 'updated_at')


class AdPlacementAdminForm(forms.ModelForm):
    class Meta:
        model = AdPlacement
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['season'].queryset = Season.objects.select_related('comic').order_by(
            'comic__title',
            'season_number',
            'title',
        )
        episode_qs = Episode.objects.select_related('season', 'season__comic').order_by(
            'season__comic__title',
            'season__season_number',
            'episode_number',
            'title',
        )
        season_id = self._selected_season_id()
        if season_id:
            episode_qs = episode_qs.filter(season_id=season_id)
        else:
            episode_qs = episode_qs.none()
        self.fields['episode'].queryset = episode_qs
        self.fields['season'].label_from_instance = self._season_label
        self.fields['episode'].label_from_instance = self._episode_label
        self.fields['episode'].empty_label = 'All episodes (season-wide ad)'
        self.fields['episode'].help_text = (
            "Leave blank to run this ad on every episode in the season. "
            "Select a single episode to limit the ad to that episode only."
        )

    def _selected_season_id(self):
        if self.instance and self.instance.season_id:
            return self.instance.season_id
        if self.is_bound:
            season_value = self.data.get(self.add_prefix('season'), self.data.get('season'))
            if season_value:
                try:
                    return int(season_value)
                except (TypeError, ValueError):
                    return None
        return None

    def clean(self):
        cleaned_data = super().clean()
        season = cleaned_data.get('season')
        episode = cleaned_data.get('episode')
        if season and episode and episode.season_id != season.id:
            self.add_error('episode', 'Episode must belong to the selected season.')
        return cleaned_data

    @staticmethod
    def _season_label(season):
        story_title = season.comic.title if season.comic else 'No story'
        return f"{story_title} - S{season.season_number}: {season.title}"

    @staticmethod
    def _episode_label(episode):
        season = episode.season
        story_title = season.comic.title if season and season.comic else 'No story'
        season_number = season.season_number if season else '?'
        return f"{story_title} - S{season_number} E{episode.episode_number}: {episode.title}"


@admin.register(AdPlacement)
class AdPlacementAdmin(admin.ModelAdmin):
    form = AdPlacementAdminForm
    change_form_template = 'admin/icvybz/adplacement/change_form.html'
    list_display = ('display_name', 'season', 'scope', 'creative', 'is_active', 'priority')
    list_filter = ('is_active', 'season__comic', 'campaign')
    list_editable = ('is_active', 'priority')
    search_fields = ('name', 'creative__title', 'season__title', 'season__comic__title')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('season', 'episode', 'campaign', 'creative', 'name', 'is_active', 'priority')}),
        ('3D Placement', {
            'fields': ('slot_name', 'position_x', 'position_y', 'position_z', 'normal_x', 'normal_y', 'normal_z', 'width', 'height', 'rotation'),
            'description': (
                'Ads only appear on seasons using the platform standard GLB '
                '(see AD_ENABLED_MODEL_BASENAMES in settings). Custom uploads are not ad-enabled.'
            ),
        }),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def display_name(self, obj):
        return obj.name or obj.creative.title
    display_name.short_description = 'Placement'

    def scope(self, obj):
        if obj.episode_id is None:
            return 'All episodes (season-wide)'
        return f"E{obj.episode.episode_number}: {obj.episode.title}"
    scope.short_description = 'Shows on'

    class Media:
        js = ('icvybz/admin/ad_placement_admin.js',)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'episode-choices/',
                self.admin_site.admin_view(self.episode_choices),
                name='icvybz_adplacement_episode_choices',
            ),
        ]
        return custom_urls + urls

    def episode_choices(self, request):
        season_id = request.GET.get('season')
        if not season_id:
            return JsonResponse({'results': []})
        try:
            season_id = int(season_id)
        except (TypeError, ValueError):
            return JsonResponse({'results': []})

        episodes = Episode.objects.filter(season_id=season_id).select_related(
            'season', 'season__comic'
        ).order_by('episode_number', 'title')
        return JsonResponse({
            'results': [
                {'id': episode.id, 'label': AdPlacementAdminForm._episode_label(episode)}
                for episode in episodes
            ],
        })


@admin.register(AdEvent)
class AdEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'creative', 'episode', 'story', 'is_suspicious', 'fraud_reason', 'created_at')
    list_filter = ('event_type', 'is_suspicious', 'fraud_reason', 'created_at', 'story')
    search_fields = ('creative__title', 'story__title', 'episode__title', 'session_key', 'ip_hash', 'user_agent_hash')
    readonly_fields = (
        'placement', 'creative', 'episode', 'story', 'event_type', 'session_key',
        'user', 'referrer', 'user_agent', 'ip_hash', 'user_agent_hash',
        'is_suspicious', 'fraud_reason', 'created_at'
    )
    date_hierarchy = 'created_at'


@admin.register(AdRevenueSplitConfig)
class AdRevenueSplitConfigAdmin(admin.ModelAdmin):
    list_display = ('creator_percentage', 'platform_percentage', 'effective_date', 'is_active', 'created_at')
    list_filter = ('is_active', 'effective_date')
    list_editable = ('is_active',)
    readonly_fields = ('created_at',)


@admin.register(AdRevenueShareSnapshot)
class AdRevenueShareSnapshotAdmin(admin.ModelAdmin):
    list_display = ('event', 'story', 'creator', 'studio', 'creator_percentage', 'platform_percentage', 'estimated_amount', 'created_at')
    list_filter = ('created_at', 'story', 'studio')
    search_fields = ('story__title', 'creator__username', 'campaign__name')
    readonly_fields = ('event', 'campaign', 'placement', 'story', 'creator', 'studio', 'creator_percentage', 'platform_percentage', 'estimated_amount', 'created_at')
