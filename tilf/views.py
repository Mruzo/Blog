from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Comic, Season, Episode, Dialogue, POV, ComicComment
from django.utils.safestring import mark_safe
from snmov.forms import CommentForm
from .forms import ComicCommentForm
import json


class ComicView(ListView):
    model = Comic
    template_name = 'tilf/titles.html'
    context_object_name = 'comics'

    def get_queryset(self):
        return Comic.objects.prefetch_related('seasons__episodes').all()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Filter episodes to only show published ones
        for comic in context['comics']:
            for season in comic.seasons.all():
                # Create a custom property to filter episodes
                season.published_episodes = season.episodes.filter(is_published=True)
        return context


class SeasonDetailView(DetailView):
    model = Season
    template_name = 'tilf/season_detail.html'
    context_object_name = 'season'


class EpisodeDetailView(DetailView):
    model = Episode
    template_name = 'tilf/episode_detail.html'
    context_object_name = 'episode'

    def get_object(self):
        season_id = self.kwargs.get('season_id')
        return get_object_or_404(Episode, pk=self.kwargs['pk'], season_id=season_id, is_published=True)
    
    def get(self, request, *args, **kwargs):
        episode = self.get_object()
        
        # Increment view count (only for published episodes)
        if episode.is_published:
            episode.increment_view()
        
        return super().get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episode = self.object

        # Get all dialogues for the episode, ordered by their 'order' field
        dialogues = Dialogue.objects.filter(episode=episode).order_by('order')

        # Get the model files directly from the season with safety checks
        try:
            context['model_gltf'] = episode.season.model_gltf.url if episode.season.model_gltf else None
            context['model_usdz'] = episode.season.model_usdz.url if episode.season.model_usdz else None
        except Exception:
            context['model_gltf'] = None
            context['model_usdz'] = None

        # Prepare dialogues data with safety checks
        dialogues_data = []
        for dialogue in dialogues:
            try:
                dialogues_data.append({
                    'dialogue_id': dialogue.id,
                    'character': dialogue.pov.character.name if dialogue.pov and dialogue.pov.character else 'Unknown',
                    'camera_orbit': dialogue.camera_orbit or '0deg 75deg 3m',
                    'camera_target': dialogue.camera_target or '0m 1.6m 0m',
                    'field_of_view': dialogue.field_of_view or 45.0,
                    'zoom_speed': dialogue.zoom_speed or 1.0,
                    'rotation': dialogue.rotation or '0deg 0deg 0deg',
                    'head_x': dialogue.pov.head_x if dialogue.pov else 0,
                    'head_y': dialogue.pov.head_y if dialogue.pov else 1.6,
                    'head_z': dialogue.pov.head_z if dialogue.pov else 0,
                    'text': dialogue.text or 'No dialogue text available'
                })
            except Exception as e:
                # Skip problematic dialogues
                continue
        
        context['dialogues_data'] = dialogues_data
        
        # Add episode summary and next episode info
        context['episode_summary'] = episode.summary
        context['summary_camera_orbit'] = episode.summary_camera_orbit
        context['summary_field_of_view'] = episode.summary_field_of_view
        
        # Find next episode in the same season
        next_episode = Episode.objects.filter(
            season=episode.season,
            episode_number__gt=episode.episode_number,
            is_published=True
        ).order_by('episode_number').first()
        
        context['next_episode'] = next_episode
        
        # Add comment form and comments
        context['comment_form'] = ComicCommentForm()
        context['comments'] = episode.comments.filter(approved_comment=True)
        
        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        comment_form = ComicCommentForm(request.POST)
        
        if comment_form.is_valid() and request.user.is_authenticated:
            comment = comment_form.save(commit=False)
            comment.user_name = request.user
            comment.episode = self.object
            comment.save()
            return redirect('immersivecomics:episode_detail', season_id=self.object.season.id, pk=self.object.pk)
            
        return self.render_to_response(self.get_context_data(comment_form=comment_form))

def delete_comment(request, season_id, pk, comment_id):
    episode = get_object_or_404(Episode, pk=pk, season_id=season_id, is_published=True)
    comment = get_object_or_404(ComicComment, pk=comment_id, episode=episode)
    
    if request.user.is_authenticated and request.user == comment.user_name:
        comment.delete()
    
    return redirect('immersivecomics:episode_detail', season_id=season_id, pk=pk)


@method_decorator(staff_member_required, name='dispatch')
class EpisodePreviewView(DetailView):
    model = Episode
    template_name = 'tilf/episode_preview.html'
    context_object_name = 'episode'

    def get_object(self):
        season_id = self.kwargs.get('season_id')
        # Allow access to unpublished episodes for preview
        return get_object_or_404(Episode, pk=self.kwargs['pk'], season_id=season_id)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episode = self.object

        # Get all dialogues for the episode, ordered by their 'order' field
        dialogues = Dialogue.objects.filter(episode=episode).order_by('order')

        # Get the model files directly from the season with safety checks
        try:
            context['model_gltf'] = episode.season.model_gltf.url if episode.season.model_gltf else None
            context['model_usdz'] = episode.season.model_usdz.url if episode.season.model_usdz else None
        except Exception:
            context['model_gltf'] = None
            context['model_usdz'] = None

        # Prepare dialogues data with safety checks
        dialogues_data = []
        for dialogue in dialogues:
            try:
                dialogues_data.append({
                    'dialogue_id': dialogue.id,
                    'character': dialogue.pov.character.name if dialogue.pov and dialogue.pov.character else 'Unknown',
                    'camera_orbit': dialogue.camera_orbit or '0deg 75deg 3m',
                    'camera_target': dialogue.camera_target or '0m 1.6m 0m',
                    'field_of_view': dialogue.field_of_view or 45.0,
                    'zoom_speed': dialogue.zoom_speed or 1.0,
                    'rotation': dialogue.rotation or '0deg 0deg 0deg',
                    'head_x': dialogue.pov.head_x if dialogue.pov else 0,
                    'head_y': dialogue.pov.head_y if dialogue.pov else 1.6,
                    'head_z': dialogue.pov.head_z if dialogue.pov else 0,
                    'text': dialogue.text or 'No dialogue text available'
                })
            except Exception as e:
                # Skip problematic dialogues
                continue
        
        context['dialogues_data'] = dialogues_data
        
        # Add episode summary and next episode info
        context['episode_summary'] = episode.summary
        context['summary_camera_orbit'] = episode.summary_camera_orbit
        context['summary_field_of_view'] = episode.summary_field_of_view
        
        # Find next episode in the same season (allow unpublished for preview)
        next_episode = Episode.objects.filter(
            season=episode.season,
            episode_number__gt=episode.episode_number
        ).order_by('episode_number').first()
        
        context['next_episode'] = next_episode
        
        # Add comment form and comments (but don't allow actual commenting in preview)
        context['comment_form'] = ComicCommentForm()
        context['comments'] = episode.comments.filter(approved_comment=True)
        context['is_preview'] = True  # Flag to indicate this is a preview
        
        return context


@csrf_exempt
@staff_member_required
@require_http_methods(["POST"])
def update_camera_data(request, dialogue_id):
    """
    API endpoint to update camera data for a dialogue via AJAX
    """
    try:
        # Parse JSON data from request
        data = json.loads(request.body)
        
        # Get the dialogue object
        dialogue = get_object_or_404(Dialogue, pk=dialogue_id)
        
        # Update camera fields if provided
        if 'camera_orbit' in data:
            dialogue.camera_orbit = data['camera_orbit']
        if 'camera_target' in data:
            dialogue.camera_target = data['camera_target']
        if 'field_of_view' in data:
            dialogue.field_of_view = float(data['field_of_view'])
        if 'zoom_speed' in data:
            dialogue.zoom_speed = float(data['zoom_speed'])
        if 'rotation' in data:
            dialogue.rotation = data['rotation']
        
        # Save the dialogue
        dialogue.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Camera data updated successfully',
            'dialogue_id': dialogue_id
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except ValueError as e:
        return JsonResponse({
            'success': False,
            'message': f'Invalid data format: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error updating camera data: {str(e)}'
        }, status=500)


@method_decorator(staff_member_required, name='dispatch')
class EpisodeAnalyticsView(ListView):
    model = Episode
    template_name = 'tilf/episode_analytics.html'
    context_object_name = 'episodes'
    
    def get_queryset(self):
        return Episode.objects.filter(is_published=True).order_by('-view_count')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episodes = context['episodes']
        
        # Add seasons list for filtering
        context['seasons'] = Season.objects.all().order_by('season_number')
        context['selected_season'] = None
        
        context['total_views'] = sum(ep.view_count for ep in episodes)
        context['avg_views'] = context['total_views'] / episodes.count() if episodes else 0
        context['most_popular'] = episodes[:5]
        context['recent_views'] = Episode.objects.filter(is_published=True).order_by('-last_viewed')[:5]
        
        return context


@method_decorator(staff_member_required, name='dispatch')
class SeasonAnalyticsView(DetailView):
    model = Season
    template_name = 'tilf/episode_analytics.html'  # Use the same template
    context_object_name = 'season'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        season = self.object
        episodes = season.episodes.filter(is_published=True).order_by('-view_count')
        
        # Add seasons list for filtering
        context['seasons'] = Season.objects.all().order_by('season_number')
        context['selected_season'] = season
        
        # Use the same context structure as EpisodeAnalyticsView
        context['episodes'] = episodes
        context['total_views'] = sum(ep.view_count for ep in episodes)
        context['avg_views'] = context['total_views'] / episodes.count() if episodes else 0
        context['most_popular'] = episodes[:5]
        context['recent_views'] = episodes.order_by('-last_viewed')[:5]
        
        return context


