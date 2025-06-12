from django.shortcuts import render, get_object_or_404
from django.views.generic import ListView, DetailView
from .models import Comic, Season, Episode, Dialogue, POV
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

        # Get all dialogues for the episode, ordered by their 'order' field
        dialogues = Dialogue.objects.filter(episode=episode).order_by('order')

        # Get the model files directly from the season
        context['model_gltf'] = episode.season.model_gltf.url if episode.season.model_gltf else None
        context['model_usdz'] = episode.season.model_usdz.url if episode.season.model_usdz else None

        # Prepare dialogues data
        dialogues_data = []
        for dialogue in dialogues:
            dialogues_data.append({
                'character': dialogue.pov.character.name,
                'camera_orbit': dialogue.camera_orbit,
                'camera_target': dialogue.camera_target,
                'field_of_view': dialogue.field_of_view,
                'zoom_speed': dialogue.zoom_speed,
                'rotation': dialogue.rotation,
                'head_x': dialogue.pov.head_x,
                'head_y': dialogue.pov.head_y,
                'head_z': dialogue.pov.head_z,
                'text': dialogue.text
            })

        context['dialogues_data'] = dialogues_data
        return context


