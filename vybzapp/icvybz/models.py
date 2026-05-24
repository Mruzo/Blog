from django.db import models
from django.db.models import F
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
import uuid

class Comic(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comics')
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    comic_image = models.ImageField(upload_to='comic_images/', null=True, blank=True)
    is_public = models.BooleanField(default=False, help_text="Make this comic visible to other users")
    moderation_status = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='approved'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")

    class Meta:
        app_label = 'icvybz'

    def save(self, *args, **kwargs):
        # Remove manual filename setting - let Django handle the upload_to path
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Season(models.Model):
    comic = models.ForeignKey(Comic, on_delete=models.CASCADE, related_name='seasons' , null=True)
    season_number = models.PositiveIntegerField(null=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    release_date = models.DateField()
    is_public = models.BooleanField(default=False, help_text="Make this season visible to other users (requires story to also be public)")
    model_gltf = models.FileField(upload_to='models/', null=True, blank=True)
    model_usdz = models.FileField(upload_to='models/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")

    class Meta:
        app_label = 'icvybz'

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
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")

    def __str__(self):
        return f"S{self.season.season_number} - E{self.episode_number}"

    def generate_meta_tags(self):
        meta_tags = {
            'title': f"{self.season.comic.title} - Episode {self.episode_number}",
            'description': self.description or self.season.comic.description,
            'image': self.cover_image.url if self.cover_image else (self.season.comic.comic_image.url if self.season.comic.comic_image else None),
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
        """Increment the view count for this episode (atomic for production concurrency)."""
        Episode.objects.filter(pk=self.pk).update(
            view_count=F('view_count') + 1,
            last_viewed=timezone.now()
        )
        self.refresh_from_db()

    class Meta:
        app_label = 'icvybz'


class Intersection(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='intersections')
    name = models.CharField(max_length=100, default="Main Intersection")
    model_gltf = models.FileField(upload_to='intersections/', blank=True, null=True)  # GLTF for Android/Web
    model_usdz = models.FileField(upload_to='intersections/', blank=True, null=True)  # USDZ for iPhones
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False, help_text="Make this intersection visible to other users")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")

    class Meta:
        app_label = 'icvybz'

    def __str__(self):
        return self.name


class Scene(models.Model):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, related_name='scenes')
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=250)
    order = models.PositiveIntegerField()  # Order of the scenes
    created_at = models.DateTimeField(auto_now_add=True)
    intersection = models.ForeignKey(Intersection, on_delete=models.CASCADE, related_name='scenes')  # Link to Intersection

    class Meta:
        app_label = 'icvybz'
    
    def __str__(self):
        return f"E{self.episode.episode_number} - Sc{self.order}"

class Character(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='characters')
    story = models.ForeignKey(Comic, on_delete=models.CASCADE, related_name='characters', null=True, blank=True, help_text="Story this character belongs to")
    name = models.CharField(max_length=50)
    personality = models.CharField(max_length=50, blank=True)
    love_interest = models.CharField(max_length=50, blank=True)
    bio = models.TextField(blank=True)
    model_file = models.FileField(upload_to='characters/')  # File path for 3D model
    is_public = models.BooleanField(default=False, help_text="Make this character visible to other users")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")

    class Meta:
        app_label = 'icvybz'
    
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

    class Meta:
        app_label = 'icvybz'

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
    pov = models.ForeignKey(POV, on_delete=models.CASCADE, related_name='dialogues', null=True, blank=True)
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='dialogues', null=True, blank=True)
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
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")
    
    class Meta:
        app_label = 'icvybz'
        ordering = ['order']  # Order by dialogue order
    
    def __str__(self):
        return f"Dialogue {self.order} in {self.episode}"
    
    def save(self, *args, **kwargs):
        # Only apply camera preset if shot_type is selected AND no manual camera settings exist
        if self.shot_type and not (self.camera_orbit and self.camera_target and self.rotation):
            # Get the speaking character's position
            # Prefer POV character, fallback to character field
            if self.pov and self.pov.character:
                speaking_char = self.pov.character.name
            elif self.character:
                speaking_char = self.character.name
            else:
                speaking_char = 'Unknown'
            
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
            if self.pov:
                head_pos = {
                    'x': self.pov.head_x,
                    'y': self.pov.head_y,
                    'z': self.pov.head_z
                }
            else:
                # Fallback to default head position if POV is not set
                head_pos = {
                    'x': 0.0,
                    'y': 1.6,
                    'z': 0.0
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
    user_name = models.ForeignKey(settings.AUTH_USER_MODEL, default=1, null=True, on_delete=models.SET_NULL)
    episode = models.ForeignKey('Episode', on_delete=models.CASCADE, related_name='comments')
    comment_date = models.DateTimeField(default=timezone.now)
    approved_comment = models.BooleanField(default=False)

    class Meta:
        app_label = 'icvybz'
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

class TrafficSource(models.Model):
    """Track where traffic is coming from"""
    SOURCE_CHOICES = [
        ('direct', 'Direct'),
        ('google', 'Google Search'),
        ('social', 'Social Media'),
        ('referral', 'Referral'),
        ('email', 'Email'),
        ('other', 'Other'),
    ]
    
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, related_name='traffic_sources')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    referrer = models.URLField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'icvybz'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.episode.title} - {self.source} - {self.timestamp}"


# Studio System Models
class Studio(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_studios')
    is_public = models.BooleanField(default=True)
    avatar_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")

    class Meta:
        app_label = 'icvybz'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def collaborators_count(self):
        return self.collaborators.filter(is_active=True).count()

    @property
    def stories_count(self):
        return self.stories.filter(is_active=True).count()


class StudioCollaborator(models.Model):
    ROLE_CHOICES = [
        ('writer', 'Writer'),
        ('3d_artist', '3D Artist'),
        ('voice_actor', 'Voice Actor'),
        ('sound_engineer', 'Sound Engineer'),
        ('cinematographer', 'Cinematographer'),
    ]

    studio = models.ForeignKey(Studio, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='studio_collaborations')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    removed_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when collaborator was removed")

    class Meta:
        app_label = 'icvybz'
        # Allow multiple roles per user: unique on studio, user, and role combination
        unique_together = [['studio', 'user', 'role']]
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} - {self.role} in {self.studio.name}"


class StudioCollaborationRequest(models.Model):
    """Requests from users to collaborate on a studio"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    
    studio = models.ForeignKey(Studio, on_delete=models.CASCADE, related_name='collaboration_requests')
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='studio_collaboration_requests')
    role = models.CharField(max_length=50, choices=StudioCollaborator.ROLE_CHOICES, default='writer')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'icvybz'
        unique_together = ['studio', 'requester']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['studio', 'status']),
            models.Index(fields=['requester', 'status']),
        ]
    
    def accept(self):
        """Accept the collaboration request and create a StudioCollaborator"""
        if self.status == 'pending':
            # Check if collaborator already exists
            collaborator, created = StudioCollaborator.objects.get_or_create(
                studio=self.studio,
                user=self.requester,
                defaults={
                    'role': self.role,
                    'is_active': True
                }
            )
            
            # Update if already exists
            if not created:
                collaborator.role = self.role
                collaborator.is_active = True
                collaborator.save()
            
            self.status = 'accepted'
            self.save()
            return True
        return False
    
    def decline(self):
        """Decline the collaboration request"""
        if self.status == 'pending':
            self.status = 'declined'
            self.save()
            return True
        return False
    
    def send_notification_email(self):
        """Send email notification to studio owner about the collaboration request"""
        from django.contrib.sites.models import Site
        
        subject = f"New Collaboration Request for {self.studio.name}"
        
        # Get site URL
        current_site = Site.objects.get_current()
        site_url = f"https://{current_site.domain}"
        frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
        
        # Generate URLs
        accept_url = f"{frontend_url}/immersivecomics/studio/{self.studio.id}/?request_id={self.id}&action=accept"
        decline_url = f"{frontend_url}/immersivecomics/studio/{self.studio.id}/?request_id={self.id}&action=decline"
        
        context = {
            'request': self,
            'studio': self.studio,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'accept_url': accept_url,
            'decline_url': decline_url,
        }
        
        try:
            html_message = render_to_string('emails/studio_collaboration_request.html', context)
            plain_message = render_to_string('emails/studio_collaboration_request.txt', context)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.studio.owner.email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Failed to send collaboration request notification email: {e}")
            return False
    
    def __str__(self):
        return f"{self.requester.username} -> {self.studio.name} ({self.status})"


# Audio System Models
class AudioTrack(models.Model):
    AUDIO_TYPES = [
        ('dialogue', 'Dialogue Voice'),
        ('sound_effect', 'Sound Effect'),
        ('music', 'Background Music'),
        ('ambient', 'Ambient Sound'),
        ('transition', 'Scene Transition'),
        ('intro', 'Episode Intro'),
        ('outro', 'Episode Outro'),
        ('action', 'Action Sound'),
        ('emotion', 'Emotional Music'),
        ('environmental', 'Environmental Sound'),
    ]

    name = models.CharField(max_length=200)
    audio_type = models.CharField(max_length=20, choices=AUDIO_TYPES)
    audio_file = models.FileField(upload_to='audio/')
    duration = models.FloatField(help_text="Duration in seconds")
    volume = models.FloatField(default=1.0, help_text="Volume level (0.0 to 1.0)")
    loop = models.BooleanField(default=False, help_text="Whether audio should loop")
    fade_in = models.FloatField(default=0.0, help_text="Fade in duration in seconds")
    fade_out = models.FloatField(default=0.0, help_text="Fade out duration in seconds")

    # Spatial audio positioning (for 3D scenes)
    position_x = models.FloatField(default=0.0, help_text="X position in 3D space")
    position_y = models.FloatField(default=0.0, help_text="Y position in 3D space")
    position_z = models.FloatField(default=0.0, help_text="Z position in 3D space")
    max_distance = models.FloatField(default=10.0, help_text="Maximum audible distance")

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_audio_tracks')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Timestamp when record was created. Nullable for imports from other Django apps.")
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, help_text="Timestamp when record was last updated. Nullable for imports from other Django apps.")
    is_public = models.BooleanField(default=False)

    class Meta:
        app_label = 'icvybz'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_audio_type_display()})"


class DialogueAudio(models.Model):
    dialogue = models.OneToOneField(Dialogue, on_delete=models.CASCADE, related_name='audio')
    
    # Multiple audio tracks for dialogue
    voice_track = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='dialogue_voices', limit_choices_to={'audio_type': 'dialogue'})
    sound_effect = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='dialogue_sfx', limit_choices_to={'audio_type': 'sound_effect'})
    action_sound = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='dialogue_action', limit_choices_to={'audio_type': 'action'})
    
    # Timing controls
    start_delay = models.FloatField(default=0.0, help_text="Delay before audio starts (seconds)")
    sync_with_text = models.BooleanField(default=True, help_text="Sync audio with text display")

    class Meta:
        app_label = 'icvybz'

    def __str__(self):
        return f"Audio for {self.dialogue}"


class EpisodeAudio(models.Model):
    episode = models.OneToOneField(Episode, on_delete=models.CASCADE, related_name='audio')
    
    # Multiple background music tracks
    main_theme = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='episode_main_theme', limit_choices_to={'audio_type': 'music'})
    emotional_music = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='episode_emotional', limit_choices_to={'audio_type': 'emotion'})
    action_music = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='episode_action_music', limit_choices_to={'audio_type': 'music'})
    
    # Ambient and environmental sounds
    ambient_sound = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='episode_ambient', limit_choices_to={'audio_type': 'ambient'})
    environmental = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='episode_environmental', limit_choices_to={'audio_type': 'environmental'})
    
    # Intro/outro
    intro_audio = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='episode_intro', limit_choices_to={'audio_type': 'intro'})
    outro_audio = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='episode_outro', limit_choices_to={'audio_type': 'outro'})

    class Meta:
        app_label = 'icvybz'

    def __str__(self):
        return f"Audio for {self.episode}"


class SceneAudio(models.Model):
    scene = models.OneToOneField(Scene, on_delete=models.CASCADE, related_name='audio')
    
    # Multiple environmental tracks
    background_ambient = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='scene_background', limit_choices_to={'audio_type': 'ambient'})
    environmental_sound = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                           related_name='scene_environmental', limit_choices_to={'audio_type': 'environmental'})
    transition_audio = models.ForeignKey(AudioTrack, on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='scene_transition', limit_choices_to={'audio_type': 'transition'})

    class Meta:
        app_label = 'icvybz'

    def __str__(self):
        return f"Audio for {self.scene}"


# Collaboration Models
class CollaborationInvite(models.Model):
    ROLE_CHOICES = [
        ('viewer', 'Viewer'),
        ('editor', 'Editor'),
        ('admin', 'Admin'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inviter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invites')
    invitee_email = models.EmailField()
    invitee_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_invites', null=True, blank=True)
    story = models.ForeignKey(Comic, on_delete=models.CASCADE, related_name='collaboration_invites')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='viewer')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        app_label = 'icvybz'
        unique_together = ['inviter', 'invitee_email', 'story']
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def send_invitation_email(self):
        """Send invitation email to the invitee using email templates"""
        from django.template.loader import render_to_string
        from django.urls import reverse
        
        subject = f"Collaboration Invitation: {self.story.title}"
        
        # Get site URL
        from django.contrib.sites.models import Site
        current_site = Site.objects.get_current()
        site_url = f"https://{current_site.domain}"
        frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
        
        # Generate URLs
        accept_url = f"{frontend_url}/immersivecomics/story/{self.story.id}/collaborators/?invite_id={self.id}&action=accept"
        decline_url = f"{frontend_url}/immersivecomics/story/{self.story.id}/collaborators/?invite_id={self.id}&action=decline"
        
        context = {
            'invite': self,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'accept_url': accept_url,
            'decline_url': decline_url,
        }
        
        try:
            html_message = render_to_string('emails/collaboration_invitation.html', context)
            plain_message = render_to_string('emails/collaboration_invitation.txt', context)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.invitee_email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Failed to send invitation email: {e}")
            return False
    
    def accept(self):
        """Accept the invitation"""
        if self.status == 'pending' and not self.is_expired():
            self.status = 'accepted'
            self.save()
            # Send notification email to inviter
            self.send_acceptance_notification()
            return True
        return False
    
    def decline(self):
        """Decline the invitation"""
        if self.status == 'pending':
            self.status = 'declined'
            self.save()
            # Send notification email to inviter
            self.send_decline_notification()
            return True
        return False
    
    def send_acceptance_notification(self):
        """Send email notification to inviter when invitation is accepted"""
        from django.template.loader import render_to_string
        from django.contrib.sites.models import Site
        
        subject = f"Collaboration Invitation Accepted - {self.story.title}"
        
        # Get site URL
        current_site = Site.objects.get_current()
        site_url = f"https://{current_site.domain}"
        frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
        
        # Generate story URL
        story_url = f"{frontend_url}/immersivecomics/story/{self.story.id}/"
        
        context = {
            'invite': self,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'story_url': story_url,
        }
        
        try:
            html_message = render_to_string('emails/collaboration_accepted.html', context)
            plain_message = render_to_string('emails/collaboration_accepted.txt', context)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.inviter.email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Failed to send acceptance notification email: {e}")
            return False
    
    def send_decline_notification(self):
        """Send email notification to inviter when invitation is declined"""
        from django.template.loader import render_to_string
        from django.contrib.sites.models import Site
        
        subject = f"Collaboration Invitation Declined - {self.story.title}"
        
        # Get site URL
        current_site = Site.objects.get_current()
        site_url = f"https://{current_site.domain}"
        frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
        
        # Generate story URL
        story_url = f"{frontend_url}/immersivecomics/story/{self.story.id}/"
        
        context = {
            'invite': self,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'story_url': story_url,
        }
        
        try:
            html_message = render_to_string('emails/collaboration_declined.html', context)
            plain_message = render_to_string('emails/collaboration_declined.txt', context)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.inviter.email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Failed to send decline notification email: {e}")
            return False
    
    def __str__(self):
        return f"{self.inviter.username} -> {self.invitee_email} ({self.story.title})"


class StoryCollaborator(models.Model):
    """Active collaborators on a story"""
    ROLE_CHOICES = [
        ('viewer', 'Viewer'),
        ('editor', 'Editor'),
        ('admin', 'Admin'),
        ('writer', 'Writer'),
        ('3d_artist', '3D Artist'),
        ('voice_actor', 'Voice Actor'),
        ('sound_engineer', 'Sound Engineer'),
        ('cinematographer', 'Cinematographer'),
    ]
    
    story = models.ForeignKey(Comic, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='story_collaborations')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='viewer')
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invited_collaborators', null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = 'icvybz'
        # Allow multiple roles per user: unique on story, user, and role combination
        unique_together = [['story', 'user', 'role']]
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.username} on {self.story.title} ({self.role})"