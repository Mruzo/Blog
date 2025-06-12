from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Comic, Season, Episode, Character, POV, Dialogue
from django.db import models
from tinymce.widgets import TinyMCE
from django import forms


class ComicInline(admin.TabularInline):
    model = Comic
    extra = 1


class SeasonInline(admin.TabularInline):
    model = Season
    extra = 1


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 1


class DialogueInline(admin.TabularInline):
    model = Dialogue
    extra = 1


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
    list_display = ('title', 'season', 'episode_number')
    list_filter = ('season',)
    inlines = [DialogueInline]
    search_fields = ('title',)
    ordering = ('season', 'episode_number')
    fields = ('title', 'season', 'episode_number', 'description', 'cover_image')


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
