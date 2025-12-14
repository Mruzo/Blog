from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Comic, Season, Episode, Character, POV, Dialogue, ComicComment, Scene
from django.db import models
from tinymce.widgets import TinyMCE
from django import forms
from django.urls import reverse, path
from django.utils.html import format_html
from django.http import HttpResponse, JsonResponse
from django.core.management import call_command
from django.utils import timezone
from django.shortcuts import redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.http import require_http_methods
import json
import os
from django.conf import settings


def _get_comic_characters(comic):
    """Helper function to get all characters used in a comic through POV/Scene/Episode/Dialogue chain"""
    # Get all episodes for this comic (through seasons)
    seasons = Season.objects.filter(comic=comic)
    episodes = Episode.objects.filter(season__in=seasons)
    
    # Get POVs through two paths:
    # 1. POVs linked to scenes in these episodes
    scenes = Scene.objects.filter(episode__in=episodes)
    povs_from_scenes = POV.objects.filter(scenes__in=scenes).distinct()
    
    # 2. POVs linked directly through dialogues in these episodes
    dialogues = Dialogue.objects.filter(episode__in=episodes)
    povs_from_dialogues = POV.objects.filter(dialogues__in=dialogues).distinct()
    
    # Combine both sets of POVs
    all_povs = (povs_from_scenes | povs_from_dialogues).distinct()
    
    # Get all unique characters from these POVs
    characters = Character.objects.filter(povs__in=all_povs).distinct()
    
    # Build character data
    character_data = []
    for character in characters:
        try:
            model_file_url = character.model_file.url if character.model_file else None
        except (ValueError, AttributeError):
            model_file_url = None
        
        character_data.append({
            'id': character.id,
            'name': character.name,
            'personality': character.personality,
            'love_interest': character.love_interest,
            'bio': character.bio,
            'model_file': model_file_url,
        })
    
    return character_data


@staff_member_required
@require_http_methods(["GET"])
def download_export(request):
    """Custom admin view to handle file downloads"""
    export_type = request.GET.get('type', 'comic')
    comic_ids = request.GET.get('comic_ids', '')
    episode_ids = request.GET.get('episode_ids', '')
    include_unpublished = request.GET.get('include_unpublished', 'false').lower() == 'true'
    
    try:
        if export_type == 'comic':
            if comic_ids:
                # Parse comic IDs
                comic_id_list = [int(id.strip()) for id in comic_ids.split(',') if id.strip()]
                queryset = Comic.objects.filter(id__in=comic_id_list)
                
                if include_unpublished:
                    return _export_comic_stories_all_response(queryset)
                else:
                    return _export_comic_stories_response(queryset)
            else:
                return JsonResponse({'error': 'No comics selected'}, status=400)
                
        elif export_type == 'episode':
            if episode_ids:
                # Parse episode IDs
                episode_id_list = [int(id.strip()) for id in episode_ids.split(',') if id.strip()]
                queryset = Episode.objects.filter(id__in=episode_id_list)
                return _export_episode_stories_response(queryset)
            else:
                return JsonResponse({'error': 'No episodes selected'}, status=400)
        else:
            return JsonResponse({'error': 'Invalid export type'}, status=400)
            
    except Exception as e:
        return JsonResponse({'error': f'Export failed: {str(e)}'}, status=500)


def _export_comic_stories_response(queryset):
    """Generate comic export response (published only)"""
    if not queryset.exists():
        return JsonResponse({'error': 'No comics selected'}, status=400)
    
    # Generate filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f'comic_export_{timestamp}.json'
    
    # Create export data directly in memory
    export_data = {
        'export_info': {
            'exported_at': str(timezone.now()),
            'total_comics': queryset.count(),
            'include_unpublished': False,
            'version': '1.0'
        },
        'comics': []
    }
    
    for comic in queryset:
        comic_data = {
            'id': comic.id,
            'title': comic.title,
            'description': comic.description,
            'seasons': [],
            'characters': _get_comic_characters(comic)
        }
        
        # Export seasons
        seasons = Season.objects.filter(comic=comic).order_by('season_number')
        for season in seasons:
            season_data = {
                'id': season.id,
                'season_number': season.season_number,
                'title': season.title,
                'description': season.description,
                'release_date': season.release_date.isoformat() if season.release_date else None,
                'episodes': []
            }
            
            # Export episodes (only published by default)
            episodes = Episode.objects.filter(season=season, is_published=True).order_by('episode_number')
            for episode in episodes:
                episode_data = _build_episode_data(episode)
                season_data['episodes'].append(episode_data)
            
            comic_data['seasons'].append(season_data)
        
        export_data['comics'].append(comic_data)
    
    # Convert to JSON and serve as download
    json_data = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
    
    response = HttpResponse(json_data, content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def _export_comic_stories_all_response(queryset):
    """Generate comic export response (all episodes)"""
    if not queryset.exists():
        return JsonResponse({'error': 'No comics selected'}, status=400)
    
    # Generate filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f'comic_export_all_{timestamp}.json'
    
    # Create export data directly in memory
    export_data = {
        'export_info': {
            'exported_at': str(timezone.now()),
            'total_comics': queryset.count(),
            'include_unpublished': True,
            'version': '1.0'
        },
        'comics': []
    }
    
    for comic in queryset:
        comic_data = {
            'id': comic.id,
            'title': comic.title,
            'description': comic.description,
            'seasons': [],
            'characters': _get_comic_characters(comic)
        }
        
        # Export seasons
        seasons = Season.objects.filter(comic=comic).order_by('season_number')
        for season in seasons:
            season_data = {
                'id': season.id,
                'season_number': season.season_number,
                'title': season.title,
                'description': season.description,
                'release_date': season.release_date.isoformat() if season.release_date else None,
                'episodes': []
            }
            
            # Export ALL episodes (including unpublished)
            episodes = Episode.objects.filter(season=season).order_by('episode_number')
            for episode in episodes:
                episode_data = _build_episode_data(episode)
                season_data['episodes'].append(episode_data)
            
            comic_data['seasons'].append(season_data)
        
        export_data['comics'].append(comic_data)
    
    # Convert to JSON and serve as download
    json_data = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
    
    response = HttpResponse(json_data, content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def _export_episode_stories_response(queryset):
    """Generate episode export response"""
    if not queryset.exists():
        return JsonResponse({'error': 'No episodes selected'}, status=400)
    
    # Generate filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f'episode_export_{timestamp}.json'
    
    # Get unique comics from selected episodes
    comics = Comic.objects.filter(
        seasons__episodes__in=queryset
    ).distinct()
    
    # Create custom export data for selected episodes
    export_data = {
        'export_info': {
            'exported_at': str(timezone.now()),
            'total_episodes': queryset.count(),
            'total_comics': comics.count(),
            'include_unpublished': True,
            'version': '1.0'
        },
        'comics': []
    }
    
    for comic in comics:
        comic_data = {
            'id': comic.id,
            'title': comic.title,
            'description': comic.description,
            'seasons': [],
            'characters': _get_comic_characters(comic)
        }
        
        # Get seasons that have selected episodes
        seasons = Season.objects.filter(
            comic=comic,
            episodes__in=queryset
        ).distinct().order_by('season_number')
        
        for season in seasons:
            season_data = {
                'id': season.id,
                'season_number': season.season_number,
                'title': season.title,
                'description': season.description,
                'release_date': season.release_date.isoformat() if season.release_date else None,
                'episodes': []
            }
            
            # Get only selected episodes for this season
            selected_episodes = queryset.filter(season=season).order_by('episode_number')
            
            for episode in selected_episodes:
                episode_data = _build_episode_data(episode)
                season_data['episodes'].append(episode_data)
            
            comic_data['seasons'].append(season_data)
        
        export_data['comics'].append(comic_data)
    
    # Convert to JSON and serve as download
    json_data = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
    
    response = HttpResponse(json_data, content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def _build_episode_data(episode):
    """Helper function to build episode data with dialogues"""
    episode_data = {
        'id': episode.id,
        'title': episode.title,
        'description': episode.description,
        'episode_number': episode.episode_number,
        'is_published': episode.is_published,
        'summary': episode.summary,
        'summary_camera_orbit': episode.summary_camera_orbit,
        'summary_field_of_view': episode.summary_field_of_view,
        'view_count': episode.view_count,
        'last_viewed': episode.last_viewed.isoformat() if episode.last_viewed else None,
        'dialogues': []
    }
    
    # Export dialogues
    dialogues = Dialogue.objects.filter(episode=episode).order_by('order')
    for dialogue in dialogues:
        dialogue_data = {
            'id': dialogue.id,
            'text': dialogue.text,
            'order': dialogue.order,
            'scene_title': dialogue.scene_title,
            'scene_description': dialogue.scene_description,
            'shot_type': dialogue.shot_type,
            'camera_orbit': dialogue.camera_orbit,
            'camera_target': dialogue.camera_target,
            'field_of_view': dialogue.field_of_view,
            'zoom_speed': dialogue.zoom_speed,
            'rotation': dialogue.rotation,
            'pov': None
        }
        
        if dialogue.pov:
            dialogue_data['pov'] = {
                'id': dialogue.pov.id,
                'title': dialogue.pov.title,
                'character': {
                    'id': dialogue.pov.character.id,
                    'name': dialogue.pov.character.name,
                    'personality': dialogue.pov.character.personality,
                    'love_interest': dialogue.pov.character.love_interest,
                    'bio': dialogue.pov.character.bio,
                },
                'head_x': dialogue.pov.head_x,
                'head_y': dialogue.pov.head_y,
                'head_z': dialogue.pov.head_z,
                'default_camera_target': dialogue.pov.default_camera_target,
            }
        
        episode_data['dialogues'].append(dialogue_data)
    
    return episode_data


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


def export_comic_stories(modeladmin, request, queryset):
    """Export selected comics to JSON (published episodes only)"""
    if not queryset.exists():
        if modeladmin:
            modeladmin.message_user(request, "No comics selected for export.", level='warning')
        return
    
    # Return the file directly using the queryset
    return _export_comic_stories_response(queryset)

export_comic_stories.short_description = "Export selected comics to JSON (published only)"

def export_comic_stories_all(modeladmin, request, queryset):
    """Export selected comics to JSON (including unpublished episodes)"""
    if not queryset.exists():
        if modeladmin:
            modeladmin.message_user(request, "No comics selected for export.", level='warning')
        return
    
    # Return the file directly using the queryset
    return _export_comic_stories_all_response(queryset)

export_comic_stories_all.short_description = "Export selected comics to JSON (all episodes)"

@admin.register(Comic)
class ComicAdmin(admin.ModelAdmin):
    list_display = ('title', 'description')
    inlines = [SeasonInline]
    actions = [export_comic_stories, export_comic_stories_all]


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('title', 'comic', 'release_date')
    list_filter = ('comic',)
    inlines = [EpisodeInline]
    search_fields = ('title',)
    ordering = ('comic', 'release_date')


def export_episode_stories(modeladmin, request, queryset):
    """Export selected episodes to JSON"""
    if not queryset.exists():
        if modeladmin:
            modeladmin.message_user(request, "No episodes selected for export.", level='warning')
        return
    
    # Return the file directly using the queryset
    return _export_episode_stories_response(queryset)

export_episode_stories.short_description = "Export selected episodes to JSON"

@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ('title', 'season', 'episode_number', 'view_count', 'last_viewed', 'is_published', 'preview_link')
    list_filter = ('season', 'is_published')
    list_editable = ('is_published',)
    inlines = [DialogueInline]
    search_fields = ('title',)
    ordering = ('season', 'episode_number')
    readonly_fields = ('view_count', 'last_viewed')
    fields = ('title', 'season', 'episode_number', 'description', 'cover_image', 'is_published', 'summary', 'summary_camera_orbit', 'summary_field_of_view', 'view_count', 'last_viewed')
    actions = [export_episode_stories]
    
    def preview_link(self, obj):
        if obj.pk:
            return format_html('<a href="{}" target="_blank">Preview/Edit</a>', 
                             reverse('immersivecomics:episode_preview', args=[obj.season.id, obj.pk]))
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
