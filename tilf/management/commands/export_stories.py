from django.core.management.base import BaseCommand
from django.core import serializers
from django.db import transaction
from tilf.models import Comic, Season, Episode, Dialogue, Character, POV
import json
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Export story data (episodes, dialogues, camera settings) to JSON format'

    def add_arguments(self, parser):
        parser.add_argument(
            '--comic-id',
            type=int,
            help='Export specific comic by ID (if not provided, exports all comics)',
        )
        parser.add_argument(
            '--output-file',
            type=str,
            default='story_export.json',
            help='Output filename (default: story_export.json)',
        )
        parser.add_argument(
            '--include-unpublished',
            action='store_true',
            help='Include unpublished episodes in export',
        )

    def handle(self, *args, **options):
        comic_id = options.get('comic_id')
        output_file = options.get('output_file')
        include_unpublished = options.get('include_unpublished')
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join(settings.BASE_DIR, 'exports')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_file)
        
        try:
            with transaction.atomic():
                # Get comics to export
                if comic_id:
                    comics = Comic.objects.filter(id=comic_id)
                    if not comics.exists():
                        self.stdout.write(
                            self.style.ERROR(f'Comic with ID {comic_id} not found')
                        )
                        return
                else:
                    comics = Comic.objects.all()
                
                if not comics.exists():
                    self.stdout.write(
                        self.style.WARNING('No comics found to export')
                    )
                    return
                
                # Prepare export data
                export_data = {
                    'export_info': {
                        'exported_at': str(settings.TIME_ZONE),
                        'total_comics': comics.count(),
                        'include_unpublished': include_unpublished,
                        'version': '1.0'
                    },
                    'comics': []
                }
                
                for comic in comics:
                    comic_data = self.export_comic(comic, include_unpublished)
                    export_data['comics'].append(comic_data)
                
                # Write to JSON file
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully exported {comics.count()} comic(s) to {output_path}'
                    )
                )
                
                # Display export summary
                total_episodes = sum(len(comic_data['seasons']) for comic_data in export_data['comics'])
                total_dialogues = sum(
                    len(season_data['episodes']) 
                    for comic_data in export_data['comics'] 
                    for season_data in comic_data['seasons']
                )
                
                self.stdout.write(f'Export Summary:')
                self.stdout.write(f'  - Comics: {comics.count()}')
                self.stdout.write(f'  - Seasons: {total_episodes}')
                self.stdout.write(f'  - Episodes: {total_dialogues}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Export failed: {str(e)}')
            )
            raise

    def export_comic(self, comic, include_unpublished):
        """Export a single comic with all related data"""
        comic_data = {
            'id': comic.id,
            'title': comic.title,
            'description': comic.description,
            'seasons': []
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
            
            # Export episodes
            episodes_query = Episode.objects.filter(season=season)
            if not include_unpublished:
                episodes_query = episodes_query.filter(is_published=True)
            
            episodes = episodes_query.order_by('episode_number')
            for episode in episodes:
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
                        'pov': {
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
                    }
                    episode_data['dialogues'].append(dialogue_data)
                
                season_data['episodes'].append(episode_data)
            
            comic_data['seasons'].append(season_data)
        
        return comic_data
