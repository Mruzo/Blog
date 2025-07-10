from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Comic, Season, Episode, Character, POV, Dialogue, ComicComment
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
    list_display = ('title', 'description')
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
    list_display = ('title', 'season', 'episode_number', 'is_published', 'preview_link')
    list_filter = ('season', 'is_published')
    list_editable = ('is_published',)
    inlines = [DialogueInline]
    search_fields = ('title',)
    ordering = ('season', 'episode_number')
    fields = ('title', 'season', 'episode_number', 'description', 'cover_image', 'is_published', 'summary', 'summary_camera_orbit', 'summary_field_of_view')
    
    def preview_link(self, obj):
        if obj.pk:
            return format_html('<a href="{}" target="_blank">Preview/Edit</a>', 
                             reverse('episode_preview', args=[obj.season.id, obj.pk]))
        return "N/A"
    preview_link.short_description = 'Preview/Edit'


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'personality', 'love_interest')
    search_fields = ('name',)


@admin.register(POV)
class POVAdmin(admin.ModelAdmin):
    list_display = ('title', 'character', 'head_x', 'head_y', 'head_z', 'default_camera_target')
    list_filter = ('character',)
    search_fields = ('character__name',)
    fields = ('title', 'character', 'head_x', 'head_y', 'head_z', 'default_camera_target')


@admin.register(Dialogue)
class DialogueAdmin(admin.ModelAdmin):
    list_display = ('episode', 'pov', 'order', 'text', 'camera_target', 'camera_orbit','shot_type')
    list_filter = ('episode', 'pov__character', 'shot_type')
    search_fields = ('text', 'pov__character__name')
    ordering = ('order','episode')

    formfield_overrides = {
        models.TextField: {'widget': TinyMCE(attrs={'style': 'height:10px;',})},
    }

    exclude = ('scene_title', 'scene_description')


@admin.register(ComicComment)
class ComicCommentAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'episode', 'comment_date', 'approved_comment')
    list_filter = ('approved_comment', 'comment_date')
    search_fields = ('comment_cont', 'user_name__username', 'episode__title')
    list_editable = ('approved_comment',)
    date_hierarchy = 'comment_date'
    ordering = ('-comment_date',)
