from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Comic, Season, Episode, Scene, Character, POV, Dialogue, SocialMediaLink, Intersection
from django.db import models
from tinymce.widgets import TinyMCE
from django import forms


class SocialMediaLinkInline(GenericTabularInline):
    model = SocialMediaLink
    extra = 1

class ComicInline(admin.TabularInline):
    model = Comic
    extra = 1

class SceneInlineForm(forms.ModelForm):
    class Meta:
        model = Scene
        fields = '__all__'
        widgets = {
            'title': forms.Textarea(attrs={'rows': 1, 'cols': 10}),
            'description': forms.Textarea(attrs={'rows': 2, 'cols': 40})  # Shrinks the text area
        }

class SceneInline(admin.TabularInline):
    model = Scene
    form = SceneInlineForm  # Apply the form to shrink the description field
    extra = 1


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 1


class DialogueInline(admin.TabularInline):
    model = Dialogue
    extra = 1


class POVInline(admin.TabularInline):
    model = POV
    extra = 1


@admin.register(Comic)
class ComicAdmin(admin.ModelAdmin):
    list_display = ('title', 'description', 'season_count')
    # inlines = [ComicInline]
    search_fields = ('title',)
    ordering = ('id',)

    def season_count(self, obj):
        return obj.seasons.count()  # Count related seasons
    season_count.short_description = 'Season Count'  # Column header in admin


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('title', 'release_date', 'episode_count')
    inlines = [EpisodeInline]
    search_fields = ('title',)
    ordering = ('release_date',)

    def episode_count(self, obj):
        return obj.episodes.count()  # Count related episodes
    episode_count.short_description = 'Episode Count'  # Column header in admin

class EpisodeAdminForm(forms.ModelForm):
    class Meta:
        model = Scene
        fields = '__all__'
        widgets = {
            'description': forms.Textarea(attrs={'rows': 2, 'cols': 40})  # Reduces the height of the box
        }

@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    form = EpisodeAdminForm
    list_display = ('title', 'season', 'episode_number')
    list_filter = ('season',)
    inlines = [SceneInline]
    search_fields = ('title',)
    ordering = ('season', 'episode_number')


class SceneAdminForm(forms.ModelForm):
    class Meta:
        model = Scene
        fields = '__all__'
        widgets = {
            'description': forms.Textarea(attrs={'rows': 2, 'cols': 40})  # Reduces the height of the box
        }

@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    form = SceneAdminForm
    list_display = ('title', 'episode', 'order')
    list_filter = ('episode',)
    search_fields = ('title', 'episode__title')
    ordering = ('episode__title', 'order')


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'personality', 'love_interest' )
    search_fields = ('name',)


@admin.register(POV)
class POVAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'character',
        'head_x',
        'head_y',
        'head_z',

    )
    list_filter = ('scenes',)
    inlines = [DialogueInline]
    search_fields = ('character__name',)  # Adjusted to search by character name

    # Optional: You can add this method if you want to show camera angles more clearly
    def camera_angles(self, obj):
        return f"X: {obj.angle_x}, Y: {obj.angle_y}, Z: {obj.angle_z}"
    camera_angles.short_description = 'Camera Angles'

@admin.register(Dialogue)
class DialogueAdmin(admin.ModelAdmin):
    list_display = ('order', 'episode', 'scene', 'pov', 'text', 'camera_orbit', 'camera_target', 'field_of_view', 'zoom_speed', 'rotation')  # Show updated camera attributes
    list_display_links = ('text', 'order')  # Make the text field clickable for editing
    list_filter = ('episode', 'scene', 'pov')  # Filter by episode and pov
    ordering = ('order', 'episode', 'pov__title')  # Order by episode and pov title
    search_fields = ('text', 'pov__title')  # Adjust search fields

    # Ensure the camera attributes are editable in the admin
    fields = ('order', 'episode', 'scene', 'pov', 'text', 'camera_orbit', 'camera_target', 'field_of_view', 'zoom_speed', 'rotation')




@admin.register(SocialMediaLink)
class SocialMediaLinkAdmin(admin.ModelAdmin):
    list_display = ('platform', 'url', 'content_object')
    list_filter = ('platform',)
    search_fields = ('url',)


@admin.register(Intersection)
class IntersectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'model_gltf', 'model_usdz')
    search_fields = ('name',)
