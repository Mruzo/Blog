import json
import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from icvybz.models import Comic, Season, Episode, Character, Dialogue, POV, Scene, Intersection
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Export story data to JSON format for import into another app'

    def add_arguments(self, parser):
        parser.add_argument('story_id', type=int, help='ID of the story to export')
        parser.add_argument('--output', '-o', type=str, help='Output file path (default: story_export.json)')
        parser.add_argument('--include-files', action='store_true', help='Include file data in export (base64 encoded)')
        parser.add_argument('--include-analytics', action='store_true', help='Include analytics data (view counts, etc.)')

    def handle(self, *args, **options):
        story_id = options['story_id']
        output_file = options.get('output', 'story_export.json')
        include_files = options.get('include_files', False)
        include_analytics = options.get('include_analytics', False)

        try:
            # Get the story
            story = Comic.objects.get(id=story_id)
            
            # Export the story data
            export_data = self.export_story(story, include_files, include_analytics)
            
            # Write to file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully exported story "{story.title}" to {output_file}')
            )
            
        except Comic.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Story with ID {story_id} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error exporting story: {str(e)}')
            )

    def export_story(self, story, include_files=False, include_analytics=False):
        """Export a complete story with all related data"""
        
        # Base story data
        story_data = {
            'metadata': {
                'export_version': '1.0',
                'export_timestamp': story.updated_at.isoformat(),
                'include_files': include_files,
                'include_analytics': include_analytics,
                'app_name': 'icvybz'
            },
            'story': {
                'title': story.title,
                'description': story.description,
                'is_public': story.is_public,
                'moderation_status': story.moderation_status,
                'created_at': story.created_at.isoformat(),
                'updated_at': story.updated_at.isoformat(),
                'comic_image': self.export_file_field(story.comic_image, include_files) if story.comic_image else None
            },
            'seasons': [],
            'characters': [],
            'intersections': []
        }

        # Export seasons and related data
        for season in story.seasons.all():
            season_data = {
                'season_number': season.season_number,
                'title': season.title,
                'description': season.description,
                'release_date': season.release_date.isoformat(),
                'model_gltf': self.export_file_field(season.model_gltf, include_files) if season.model_gltf else None,
                'model_usdz': self.export_file_field(season.model_usdz, include_files) if season.model_usdz else None,
                'episodes': []
            }

            # Export episodes
            for episode in season.episodes.all():
                episode_data = {
                    'episode_number': episode.episode_number,
                    'title': episode.title,
                    'description': episode.description,
                    'is_published': episode.is_published,
                    'summary': episode.summary,
                    'summary_camera_orbit': episode.summary_camera_orbit,
                    'summary_field_of_view': episode.summary_field_of_view,
                    'cover_image': self.export_file_field(episode.cover_image, include_files) if episode.cover_image else None,
                    'dialogues': []
                }

                # Include analytics if requested
                if include_analytics:
                    episode_data.update({
                        'view_count': episode.view_count,
                        'last_viewed': episode.last_viewed.isoformat()
                    })

                # Export dialogues
                for dialogue in episode.dialogues.all():
                    dialogue_data = {
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
                        'character_name': dialogue.pov.character.name,
                        'character_head_x': dialogue.pov.head_x,
                        'character_head_y': dialogue.pov.head_y,
                        'character_head_z': dialogue.pov.head_z,
                        'character_default_camera_target': dialogue.pov.default_camera_target
                    }
                    episode_data['dialogues'].append(dialogue_data)

                season_data['episodes'].append(episode_data)

            story_data['seasons'].append(season_data)

        # Export characters used in this story
        character_ids = set()
        for season in story.seasons.all():
            for episode in season.episodes.all():
                for dialogue in episode.dialogues.all():
                    character_ids.add(dialogue.pov.character.id)

        for character_id in character_ids:
            character = Character.objects.get(id=character_id)
            character_data = {
                'name': character.name,
                'personality': character.personality,
                'love_interest': character.love_interest,
                'bio': character.bio,
                'is_public': character.is_public,
                'created_at': character.created_at.isoformat(),
                'updated_at': character.updated_at.isoformat(),
                'model_file': self.export_file_field(character.model_file, include_files) if character.model_file else None
            }
            story_data['characters'].append(character_data)

        # Export intersections used in this story
        intersection_ids = set()
        for season in story.seasons.all():
            for episode in season.episodes.all():
                for scene in episode.scenes.all():
                    intersection_ids.add(scene.intersection.id)

        for intersection_id in intersection_ids:
            intersection = Intersection.objects.get(id=intersection_id)
            intersection_data = {
                'name': intersection.name,
                'description': intersection.description,
                'is_public': intersection.is_public,
                'created_at': intersection.created_at.isoformat(),
                'updated_at': intersection.updated_at.isoformat(),
                'model_gltf': self.export_file_field(intersection.model_gltf, include_files) if intersection.model_gltf else None,
                'model_usdz': self.export_file_field(intersection.model_usdz, include_files) if intersection.model_usdz else None
            }
            story_data['intersections'].append(intersection_data)

        return story_data

    def export_file_field(self, file_field, include_files=False):
        """Export file field data"""
        if not file_field:
            return None
        
        file_data = {
            'filename': file_field.name,
            'size': None,
            'url': None
        }
        
        # Safely get file size and URL
        try:
            if hasattr(file_field, 'size') and file_field.name:
                file_data['size'] = file_field.size
        except (OSError, FileNotFoundError):
            file_data['size'] = None
        
        try:
            if hasattr(file_field, 'url') and file_field.name:
                file_data['url'] = file_field.url
        except (OSError, FileNotFoundError):
            file_data['url'] = None
        
        if include_files and file_field and file_field.name:
            try:
                # Read file content and encode as base64
                import base64
                with file_field.open('rb') as f:
                    file_content = f.read()
                    file_data['content'] = base64.b64encode(file_content).decode('utf-8')
                    file_data['content_type'] = file_field.content_type if hasattr(file_field, 'content_type') else 'application/octet-stream'
            except Exception as e:
                file_data['error'] = f'Could not read file: {str(e)}'
        
        return file_data
