from django.db import models

class Comic(models.Model):
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title

class Season(models.Model):
    comic = models.ForeignKey(Comic, on_delete=models.CASCADE, related_name='seasons' , null=True)
    season_number = models.PositiveIntegerField(null=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    release_date = models.DateField()

    def __str__(self):
        return f"{self.season_number}"


class Episode(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='episodes')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    episode_number = models.PositiveIntegerField()  # Order of episode in season

    def __str__(self):
        return f"S{self.season.season_number} - E{self.episode_number}"


class Intersection(models.Model):
    name = models.CharField(max_length=100, default="Main Intersection")
    model_gltf = models.FileField(upload_to='intersections/', blank=True, null=True)  # GLTF for Android/Web
    model_usdz = models.FileField(upload_to='intersections/', blank=True, null=True)  # USDZ for iPhones
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Scene(models.Model):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, null=True, related_name='scenes')
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

    # Camera angles and zoom level
    angle_x = models.FloatField(default=0.0)
    angle_y = models.FloatField(default=0.0)
    angle_z = models.FloatField(default=0.0)
    zoom_level = models.FloatField(default=1.0)

    # Character head position for speech bubbles (stored per POV)
    head_x = models.FloatField(default=0.0, help_text="Character's head X coordinate in world space")
    head_y = models.FloatField(default=1.6, help_text="Character's head Y coordinate (approx. head height)")
    head_z = models.FloatField(default=0.0, help_text="Character's head Z coordinate in world space")

    def __str__(self):
        return f"{self.character.name}"

    

class Dialogue(models.Model):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE)  # Link to Episode
    pov = models.ForeignKey(POV, on_delete=models.CASCADE, related_name='dialogues')
    scene = models.ForeignKey(Scene, related_name='dialogues', on_delete=models.CASCADE)  # Add this line
    text = models.TextField()
    order = models.PositiveIntegerField()  # Order in which dialogue appears within a POV

    # Camera attributes
    camera_orbit = models.CharField(max_length=50, default="0deg 75deg 3m")  # Example: "90deg 75deg 3m"
    camera_target = models.CharField(max_length=50, default="0m 0m 0m")  # Example: "0m 1m 0m"
    field_of_view = models.FloatField(default=45.0)  # Example: 45.0 degrees
    zoom_speed = models.FloatField(default=1.0)  # Example: 1.0 (default speed)
    rotation = models.CharField(max_length=50, default="0deg 0deg 0deg")  # Example: "0deg 180deg 0deg"
    
    def __str__(self):
        return f"Dialogue {self.order} in {self.pov}"
    
    def save(self, *args, **kwargs):
        self.text = self.text.strip()  # Removes leading and trailing whitespace
        super().save(*args, **kwargs)

class SocialMediaLink(models.Model):
    PLATFORM_CHOICES = [
        ('LinkedIn', 'LinkedIn'),
        ('Twitter', 'Twitter'),
        # Add other platforms as needed
    ]
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES)
    url = models.URLField(max_length=200)
    content_type = models.ForeignKey('contenttypes.ContentType', on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = models.ForeignKey(
        Intersection, 
        on_delete=models.CASCADE, 
        related_name='social_links', 
        blank=True, null=True
    )

    def __str__(self):
        return f"{self.platform} link for {self.content_object}"