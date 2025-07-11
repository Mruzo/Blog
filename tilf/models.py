from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.template.loader import render_to_string

class Comic(models.Model):
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    comic_image = models.ImageField(upload_to='comic_images/', null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.title:
            # Create a filename based on comic title
            comic_title = self.title.lower().replace(' ', '_')
            self.comic_image.name = f'comic_images/{comic_title}.jpg'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Season(models.Model):
    comic = models.ForeignKey(Comic, on_delete=models.CASCADE, related_name='seasons' , null=True)
    season_number = models.PositiveIntegerField(null=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    release_date = models.DateField()
    model_gltf = models.FileField(upload_to='models/', null=True, blank=True)
    model_usdz = models.FileField(upload_to='models/', null=True, blank=True)

    def __str__(self):
        return f"{self.season_number}"


class Episode(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='episodes')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    episode_number = models.PositiveIntegerField()  # Order of episode in season
    cover_image = models.ImageField(upload_to='episode_covers/', null=True, blank=True)
    is_published = models.BooleanField(default=False, help_text="Check this to make the episode visible on the website")
    summary = models.TextField(blank=True, help_text="Summary and lead-in for the next episode")
    summary_camera_orbit = models.CharField(max_length=50, blank=True, help_text="Camera position for episode summary (e.g., '0deg 75deg 5m')")
    summary_field_of_view = models.FloatField(default=60.0, help_text="Field of view for episode summary in degrees")
    view_count = models.PositiveIntegerField(default=0, help_text="Number of times this episode has been viewed")
    last_viewed = models.DateTimeField(auto_now=True, help_text="Last time this episode was viewed")

    def __str__(self):
        return f"S{self.season.season_number} - E{self.episode_number}"

    def generate_meta_tags(self):
        meta_tags = {
            'title': self.season.comic.title,
            'description': self.season.comic.description,
            'image': self.season.comic.comic_image.url if self.season.comic.comic_image else None,
            'url': self.get_absolute_url()
        }
        return render_to_string('meta_tags.html', {'meta_tags': meta_tags})

    def get_absolute_url(self):
        return f"/immersivecomics/seasons/{self.season.id}/episodes/{self.id}/"
    
    def approved_comments_count(self):
        return self.comments.filter(approved_comment=True).count()
    
    @classmethod
    def published(cls):
        return cls.objects.filter(is_published=True)
    
    @property
    def is_public(self):
        return self.is_published
    
    def increment_view(self):
        """Increment the view count for this episode"""
        self.view_count += 1
        self.save(update_fields=['view_count', 'last_viewed'])


class Intersection(models.Model):
    name = models.CharField(max_length=100, default="Main Intersection")
    model_gltf = models.FileField(upload_to='intersections/', blank=True, null=True)  # GLTF for Android/Web
    model_usdz = models.FileField(upload_to='intersections/', blank=True, null=True)  # USDZ for iPhones
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Scene(models.Model):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, related_name='scenes')
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=250)
    order = models.PositiveIntegerField()  # Order of the scenes
    created_at = models.DateTimeField(auto_now_add=True)
    intersection = models.ForeignKey(Intersection, on_delete=models.CASCADE, related_name='scenes')  # Link to Intersection
    
    def __str__(self):
        return f"E{self.episode.episode_number} - Sc{self.order}"

class Character(models.Model):
    name = models.CharField(max_length=50)
    personality = models.CharField(max_length=50, blank=True)
    love_interest = models.CharField(max_length=50, blank=True)
    bio = models.TextField(blank=True)
    model_file = models.FileField(upload_to='characters/')  # File path for 3D model
    
    def __str__(self):
        return self.name
    

class POV(models.Model):
    title = models.CharField(max_length=200)
    scenes = models.ManyToManyField(Scene, related_name='povs')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='povs')

    # Character head position for speech bubbles and camera targeting
    head_x = models.FloatField(default=0.0, help_text="Character's head X coordinate in world space")
    head_y = models.FloatField(default=1.6, help_text="Character's head Y coordinate (approx. head height)")
    head_z = models.FloatField(default=0.0, help_text="Character's head Z coordinate in world space")
    
    # Default camera target for this POV
    default_camera_target = models.CharField(max_length=50, default="0m 1.6m 0m", help_text="Default point the camera looks at for this POV (e.g., '0m 1.6m 0m')")

    def __str__(self):
        return f"{self.character.name}"

    

class Dialogue(models.Model):
    # Shot type choices
    SHOT_TYPES = [
        ('closeUp', 'Close Up'),
        ('mediumShot', 'Medium Shot'),
        ('wideShot', 'Wide Shot'),
        ('heroShot', 'Hero Shot (Low Angle)'),
        ('vulnerableShot', 'Vulnerable Shot (High Angle)'),
        ('overShoulder', 'Over the Shoulder'),
        ('confrontation', 'Confrontation Shot'),
    ]

    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, related_name='dialogues')  # Link to Episode
    pov = models.ForeignKey(POV, on_delete=models.CASCADE, related_name='dialogues')
    text = models.TextField()
    order = models.PositiveIntegerField()  # Order in which dialogue appears within the episode
    scene_title = models.CharField(max_length=100, blank=True)  # Optional scene title
    scene_description = models.TextField(max_length=250, blank=True)  # Optional scene description

    # Camera attributes
    shot_type = models.CharField(max_length=20, choices=SHOT_TYPES, default='mediumShot', help_text="Select a camera preset for this dialogue")
    camera_orbit = models.CharField(max_length=50, default="0deg 75deg 3m", help_text="Camera position in degrees and meters (e.g., '0deg 75deg 3m')")
    camera_target = models.CharField(max_length=50, blank=True, null=True, help_text="Optional override for the camera target point (e.g., '0m 1.6m 0m'). If empty, uses POV's default target.")
    field_of_view = models.FloatField(default=45.0, help_text="Camera field of view in degrees")
    zoom_speed = models.FloatField(default=1.0, help_text="Speed of camera transitions")
    rotation = models.CharField(max_length=50, default="0deg 0deg 0deg", help_text="Model rotation in degrees (e.g., '0deg 0deg 0deg')")
    
    class Meta:
        ordering = ['order']  # Order by dialogue order
    
    def __str__(self):
        return f"Dialogue {self.order} in {self.episode}"
    
    def save(self, *args, **kwargs):
        # Only apply camera preset if shot_type is selected AND no manual camera settings exist
        if self.shot_type and not (self.camera_orbit and self.camera_target and self.rotation):
            # Get the speaking character's position
            speaking_char = self.pov.character.name
            
            # Define character positions and their corresponding camera orbits
            char_positions = {
                'Nel': {  # North
                    'x': -4.5, 'y': 2.5, 'z': 2.6,
                    'rotation': '0deg 0deg 0deg',  # Facing North
                    'camera_orbits': {
                        'closeUp': '0deg 75deg 1m',      # Directly in front
                        'mediumShot': '0deg 75deg 3m',   # Medium distance
                        'wideShot': '0deg 75deg 5m',     # Far back
                        'heroShot': '0deg 15deg 3m',     # Low angle
                        'vulnerableShot': '0deg 120deg 3m', # High angle
                        'overShoulder': '45deg 75deg 2m',  # Side angle
                        'confrontation': '0deg 90deg 2m'   # Eye level
                    }
                },
                'Sam': {  # South
                    'x': 4.5, 'y': 2.71, 'z': -2.6,
                    'rotation': '180deg 0deg 0deg',  # Facing South
                    'camera_orbits': {
                        'closeUp': '180deg 75deg 1m',    # Directly in front
                        'mediumShot': '180deg 75deg 3m', # Medium distance
                        'wideShot': '180deg 75deg 5m',   # Far back
                        'heroShot': '180deg 15deg 3m',   # Low angle
                        'vulnerableShot': '180deg 120deg 3m', # High angle
                        'overShoulder': '225deg 75deg 2m',  # Side angle
                        'confrontation': '180deg 90deg 2m'   # Eye level
                    }
                },
                'Will': {  # East
                    'x': 2.0, 'y': 2.5, 'z': 4.5,
                    'rotation': '90deg 0deg 0deg',  # Facing East
                    'camera_orbits': {
                        'closeUp': '90deg 75deg 1m',     # Directly in front
                        'mediumShot': '90deg 75deg 3m',  # Medium distance
                        'wideShot': '90deg 75deg 5m',    # Far back
                        'heroShot': '90deg 15deg 3m',    # Low angle
                        'vulnerableShot': '90deg 120deg 3m', # High angle
                        'overShoulder': '135deg 75deg 2m',  # Side angle
                        'confrontation': '90deg 90deg 2m'   # Eye level
                    }
                },
                'Ed': {  # West
                    'x': -2.5, 'y': 2.71, 'z': -4.5,
                    'rotation': '-90deg 0deg 0deg',  # Facing West
                    'camera_orbits': {
                        'closeUp': '-90deg 75deg 1m',    # Directly in front
                        'mediumShot': '-90deg 75deg 3m', # Medium distance
                        'wideShot': '-90deg 75deg 5m',   # Far back
                        'heroShot': '-90deg 15deg 3m',   # Low angle
                        'vulnerableShot': '-90deg 120deg 3m', # High angle
                        'overShoulder': '-45deg 75deg 2m',  # Side angle
                        'confrontation': '-90deg 90deg 2m'   # Eye level
                    }
                },
            }
            
            # Get the speaking character's position and rotation
            char_pos = char_positions.get(speaking_char, {
                'x': 0, 'y': 1.6, 'z': 0, 
                'rotation': '0deg 0deg 0deg',
                'camera_orbits': {
                    'closeUp': '0deg 75deg 1m',
                    'mediumShot': '0deg 75deg 3m',
                    'wideShot': '0deg 75deg 5m',
                    'heroShot': '0deg 15deg 3m',
                    'vulnerableShot': '0deg 120deg 3m',
                    'overShoulder': '45deg 75deg 2m',
                    'confrontation': '0deg 90deg 2m'
                }
            })
            
            # Use POV head position for camera target
            head_pos = {
                'x': self.pov.head_x,
                'y': self.pov.head_y,
                'z': self.pov.head_z
            }
            
            # Calculate camera position based on shot type and character position
            presets = {
                'closeUp': {
                    'orbit': char_pos['camera_orbits']['closeUp'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 30,
                    'rotation': char_pos['rotation']
                },
                'mediumShot': {
                    'orbit': char_pos['camera_orbits']['mediumShot'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 45,
                    'rotation': char_pos['rotation']
                },
                'wideShot': {
                    'orbit': char_pos['camera_orbits']['wideShot'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 60,
                    'rotation': char_pos['rotation']
                },
                'heroShot': {
                    'orbit': char_pos['camera_orbits']['heroShot'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 45,
                    'rotation': char_pos['rotation']
                },
                'vulnerableShot': {
                    'orbit': char_pos['camera_orbits']['vulnerableShot'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 45,
                    'rotation': char_pos['rotation']
                },
                'overShoulder': {
                    'orbit': char_pos['camera_orbits']['overShoulder'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 45,
                    'rotation': char_pos['rotation']
                },
                'confrontation': {
                    'orbit': char_pos['camera_orbits']['confrontation'],
                    'target': f"{head_pos['x']}m {head_pos['y']}m {head_pos['z']}m",
                    'fov': 40,
                    'rotation': char_pos['rotation']
                },
            }
            
            preset = presets.get(self.shot_type)
            if preset:
                # Only set values if they haven't been manually set
                if not self.camera_orbit:
                    self.camera_orbit = preset['orbit']
                if not self.camera_target:
                    self.camera_target = preset['target']
                if not self.field_of_view:
                    self.field_of_view = preset['fov']
                if not self.rotation:
                    self.rotation = preset['rotation']

        self.text = self.text.strip()  # Removes leading and trailing whitespace
        super().save(*args, **kwargs)

class ComicComment(models.Model):
    comment_cont = models.TextField(max_length=200, verbose_name='Comment')
    user_name = models.ForeignKey(User, default=1, null=True, on_delete=models.SET_NULL)
    episode = models.ForeignKey('Episode', on_delete=models.CASCADE, related_name='comments')
    comment_date = models.DateTimeField(default=timezone.now)
    approved_comment = models.BooleanField(default=False)

    class Meta:
        ordering = ['-comment_date']

    def __str__(self):
        return self.comment_cont

    def get_absolute_url(self):
        return f"/immersivecomics/seasons/{self.episode.season.id}/episodes/{self.episode.id}/"

    def get_delete_url(self):
        return f"{self.get_absolute_url()}delete-comment/{self.pk}/"

    def approve(self):
        self.approved_comment = True
        self.save()