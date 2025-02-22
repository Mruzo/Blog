from django.shortcuts import render, get_object_or_404
from django.views.generic import ListView, DetailView
from .models import Comic, Season, Episode, Scene, Dialogue
from django.utils.safestring import mark_safe
import json


class ComicView(ListView):
    model = Comic
    template_name = 'tilf/titles.html'
    context_object_name = 'comics'

    def get_queryset(self):
        return Comic.objects.prefetch_related('seasons__episodes').all()


class SeasonDetailView(DetailView):
    model = Season
    template_name = 'tilf/season_detail.html'
    context_object_name = 'season'


from django.shortcuts import get_object_or_404
from django.views.generic import DetailView
from .models import Episode, Scene, Dialogue, POV

class EpisodeDetailView(DetailView):
    model = Episode
    template_name = 'tilf/episode_detail.html'
    context_object_name = 'episode'

    def get_object(self):
        season_id = self.kwargs.get('season_id')
        return get_object_or_404(Episode, pk=self.kwargs['pk'], season_id=season_id)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episode = self.object

        # Get all scenes in the episode, ordered by their 'order' field
        scenes = Scene.objects.filter(episode=episode).order_by('order')
        context['scenes'] = scenes

        # Prepare dialogues and character head positions for each scene
        scenes_data = []
        for scene in scenes:
            dialogues = Dialogue.objects.filter(scene=scene).order_by('order')

            pov_data = []
            for dialogue in dialogues:
                pov = dialogue.pov  # Get the POV for this dialogue
                pov_data.append({
                    'pov': pov,
                    'head_x': pov.head_x,
                    'head_y': pov.head_y,
                    'head_z': pov.head_z,
                })

            scenes_data.append({
                'scene': scene,
                'dialogues': dialogues,
                'model_gltf': scene.intersection.model_gltf.url if scene.intersection.model_gltf else None,
                'model_usdz': scene.intersection.model_usdz.url if scene.intersection.model_usdz else None,
                'pov_data': pov_data,  # Include character head positions for each dialogue
            })

        context['scenes_data'] = scenes_data
        return context




class SceneDetailView(DetailView):
    model = Scene
    template_name = 'tilf/scene_detail.html'
    context_object_name = 'scene'

    def get_object(self):
        episode_id = self.kwargs.get('episode_id')
        return get_object_or_404(Scene, pk=self.kwargs['pk'], episode_id=episode_id)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        scene = self.object  # Current scene
        episode = scene.episode  # Current episode

        # Add the GLTF file to the context if it exists
        intersection = scene.intersection
        context['gltf_file_url'] = intersection.model_file.url if intersection and intersection.model_file else None
        
        # Get all scenes in the episode, ordered by their 'order' field
        scenes_in_episode = Scene.objects.filter(episode=episode).order_by('order')
        scene_ids = list(scenes_in_episode.values_list('id', flat=True))  # List of scene IDs for navigation

        # Find the current scene's position in the episode
        current_scene_index = scene_ids.index(scene.id)

        # Add navigation context
        if current_scene_index > 0:
            context['previous_scene_id'] = scene_ids[current_scene_index - 1]
        if current_scene_index < len(scene_ids) - 1:
            context['next_scene_id'] = scene_ids[current_scene_index + 1]

        # Filter dialogues based on the current scene
        dialogues = Dialogue.objects.filter(scene=scene).order_by('order')

        # Prepare dialogues data with detailed POV info
        dialogues_data = [
            {

                'camera_orbit': dialogue.camera_orbit,
                'camera_target': dialogue.camera_target,
                'field_of_view': dialogue.field_of_view,
                'zoom_speed': dialogue.zoom_speed,
                'rotation': dialogue.rotation,
            }
            for dialogue in dialogues
        ]
        
        context['dialogues_json'] = mark_safe(json.dumps(dialogues_data))
        
        return context


