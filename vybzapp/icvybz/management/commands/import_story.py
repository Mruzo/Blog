import json
import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model

User = get_user_model()
from icvybz.models import Comic, Season, Episode, Character, Dialogue, POV, Scene, Intersection
from datetime import datetime


class Command(BaseCommand):
    help = 'Import story data from JSON format exported from another app'

    def add_arguments(self, parser):
        parser.add_argument('input_file', type=str, help='Path to the JSON file to import')
        parser.add_argument('--user-id', type=int, help='User ID to assign the imported story to')
        parser.add_argument('--username', type=str, help='Username to assign the imported story to')
        parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without actually importing')
        parser.add_argument('--skip-files', action='store_true', help='Skip importing file data (images, models)')

    def handle(self, *args, **options):
        input_file = options['input_file']
        user_id = options.get('user_id')
        username = options.get('username')
        dry_run = options.get('dry_run', False)
        skip_files = options.get('skip_files', False)

        try:
            # Get the user
            user = self.get_user(user_id, username)
            
            # Load the JSON data
            with open(input_file, 'r', encoding='utf-8') as f:
                import_data = json.load(f)
            
            if dry_run:
                self.show_import_preview(import_data)
                return
            
            # Import the story
            story = self.import_story(import_data, user, skip_files)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully imported story "{story.title}" with ID {story.id}')
            )
            
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f'File {input_file} not found')
            )
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Invalid JSON file: {str(e)}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error importing story: {str(e)}')
            )

    def get_user(self, user_id, username):
        """Get user by ID or username"""
        if user_id:
            return User.objects.get(id=user_id)
        elif username:
            return User.objects.get(username=username)
        else:
            # Default to first user
            return User.objects.first()

    def show_import_preview(self, import_data):
        """Show what would be imported without actually importing"""
        story_data = import_data.get('story', {})
        seasons = import_data.get('seasons', [])
        characters = import_data.get('characters', [])
        intersections = import_data.get('intersections', [])
        
        self.stdout.write(self.style.WARNING('DRY RUN - No data will be imported'))
        self.stdout.write(f'Story: {story_data.get("title", "Unknown")}')
        self.stdout.write(f'Seasons: {len(seasons)}')
        self.stdout.write(f'Characters: {len(characters)}')
        self.stdout.write(f'Intersections: {len(intersections)}')
        
        total_episodes = sum(len(season.get('episodes', [])) for season in seasons)
        total_dialogues = sum(
            len(episode.get('dialogues', [])) 
            for season in seasons 
            for episode in season.get('episodes', [])
        )
        
        self.stdout.write(f'Total Episodes: {total_episodes}')
        self.stdout.write(f'Total Dialogues: {total_dialogues}')

    def import_story(self, import_data, user, skip_files=False):
        """Import a complete story with all related data"""
        
        story_data = import_data.get('story', {})
        
        # Create the story
        story = Comic.objects.create(
            user=user,
            title=story_data.get('title', 'Imported Story'),
            description=story_data.get('description', ''),
            is_public=story_data.get('is_public', False),
            moderation_status=story_data.get('moderation_status', 'pending')
        )
        
        # Import comic image if available
        if not skip_files and story_data.get('comic_image'):
            self.import_file_field(story_data['comic_image'], story.comic_image)
        
        # Import characters first (needed for dialogues)
        character_map = {}
        for char_data in import_data.get('characters', []):
            character = self.import_character(char_data, user, skip_files)
            character_map[char_data['name']] = character
        
        # Import intersections
        intersection_map = {}
        for intersection_data in import_data.get('intersections', []):
            intersection = self.import_intersection(intersection_data, user, skip_files)
            intersection_map[intersection_data['name']] = intersection
        
        # Import seasons and episodes
        for season_data in import_data.get('seasons', []):
            season = self.import_season(season_data, story, skip_files)
            
            for episode_data in season_data.get('episodes', []):
                episode = self.import_episode(episode_data, season, skip_files)
                
                # Import dialogues
                for dialogue_data in episode_data.get('dialogues', []):
                    self.import_dialogue(dialogue_data, episode, character_map)
        
        return story

    def import_character(self, char_data, user, skip_files=False):
        """Import a character"""
        character, created = Character.objects.get_or_create(
            user=user,
            name=char_data['name'],
            defaults={
                'personality': char_data.get('personality', ''),
                'love_interest': char_data.get('love_interest', ''),
                'bio': char_data.get('bio', ''),
                'is_public': char_data.get('is_public', False)
            }
        )
        
        # Import character model file if available
        if not skip_files and char_data.get('model_file'):
            self.import_file_field(char_data['model_file'], character.model_file)
        
        return character

    def import_intersection(self, intersection_data, user, skip_files=False):
        """Import an intersection"""
        intersection, created = Intersection.objects.get_or_create(
            user=user,
            name=intersection_data['name'],
            defaults={
                'description': intersection_data.get('description', ''),
                'is_public': intersection_data.get('is_public', False)
            }
        )
        
        # Import intersection models if available
        if not skip_files:
            if intersection_data.get('model_gltf'):
                self.import_file_field(intersection_data['model_gltf'], intersection.model_gltf)
            if intersection_data.get('model_usdz'):
                self.import_file_field(intersection_data['model_usdz'], intersection.model_usdz)
        
        return intersection

    def import_season(self, season_data, story, skip_files=False):
        """Import a season"""
        season = Season.objects.create(
            comic=story,
            season_number=season_data.get('season_number'),
            title=season_data.get('title', 'Imported Season'),
            description=season_data.get('description', ''),
            release_date=datetime.fromisoformat(season_data.get('release_date', '2024-01-01')).date()
        )
        
        # Import season models if available
        if not skip_files:
            if season_data.get('model_gltf'):
                self.import_file_field(season_data['model_gltf'], season.model_gltf)
            if season_data.get('model_usdz'):
                self.import_file_field(season_data['model_usdz'], season.model_usdz)
        
        return season

    def import_episode(self, episode_data, season, skip_files=False):
        """Import an episode"""
        episode = Episode.objects.create(
            season=season,
            episode_number=episode_data.get('episode_number', 1),
            title=episode_data.get('title', 'Imported Episode'),
            description=episode_data.get('description', ''),
            is_published=episode_data.get('is_published', False),
            summary=episode_data.get('summary', ''),
            summary_camera_orbit=episode_data.get('summary_camera_orbit', ''),
            summary_field_of_view=episode_data.get('summary_field_of_view', 60.0),
            view_count=episode_data.get('view_count', 0)
        )
        
        # Import episode cover image if available
        if not skip_files and episode_data.get('cover_image'):
            self.import_file_field(episode_data['cover_image'], episode.cover_image)
        
        return episode

    def import_dialogue(self, dialogue_data, episode, character_map):
        """Import a dialogue"""
        character_name = dialogue_data.get('character_name')
        if character_name not in character_map:
            self.stdout.write(
                self.style.WARNING(f'Character "{character_name}" not found, skipping dialogue')
            )
            return
        
        character = character_map[character_name]
        
        # Create or get POV for this character
        pov, created = POV.objects.get_or_create(
            character=character,
            title=f"{character.name} POV",
            defaults={
                'head_x': dialogue_data.get('character_head_x', 0.0),
                'head_y': dialogue_data.get('character_head_y', 1.6),
                'head_z': dialogue_data.get('character_head_z', 0.0),
                'default_camera_target': dialogue_data.get('character_default_camera_target', '0m 1.6m 0m')
            }
        )
        
        # Create the dialogue
        Dialogue.objects.create(
            episode=episode,
            pov=pov,
            text=dialogue_data.get('text', ''),
            order=dialogue_data.get('order', 1),
            scene_title=dialogue_data.get('scene_title', ''),
            scene_description=dialogue_data.get('scene_description', ''),
            shot_type=dialogue_data.get('shot_type', 'mediumShot'),
            camera_orbit=dialogue_data.get('camera_orbit', '0deg 75deg 3m'),
            camera_target=dialogue_data.get('camera_target', ''),
            field_of_view=dialogue_data.get('field_of_view', 45.0),
            zoom_speed=dialogue_data.get('zoom_speed', 1.0),
            rotation=dialogue_data.get('rotation', '0deg 0deg 0deg')
        )

    def import_file_field(self, file_data, field):
        """Import file data into a model field"""
        if not file_data or not file_data.get('content'):
            return
        
        try:
            import base64
            content = base64.b64decode(file_data['content'])
            filename = file_data.get('filename', 'imported_file')
            
            # Create the file
            django_file = ContentFile(content, name=filename)
            field.save(filename, django_file, save=True)
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Could not import file {file_data.get("filename", "unknown")}: {str(e)}')
            )



