from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Comic, Season, Episode, Character, POV, Dialogue, ComicComment, Intersection, Studio, StudioCollaborator, StudioCollaborationRequest
from django.db import models
from tinymce.widgets import TinyMCE
from django import forms
from django.urls import reverse
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
