from rest_framework import serializers
from .models import Comic, Season, Episode, Dialogue, Character, Studio, AudioTrack, CollaborationInvite, StoryCollaborator, StudioCollaborator, StudioCollaborationRequest
from django.contrib.auth.models import User

class ComicSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    total_views = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Comic
        fields = [
            'id', 'title', 'description', 'comic_image', 'is_public', 'moderation_status',
            'created_at', 'updated_at', 'user', 'user_username', 'total_views'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'total_views']
    
    def validate_title(self, value):
        """Validate title length"""
        if value and len(value) > 20:
            raise serializers.ValidationError("Story title cannot exceed 20 characters.")
        return value
    
    def validate_description(self, value):
        """Validate description length"""
        if value and len(value) > 300:
            raise serializers.ValidationError("Story description cannot exceed 300 characters.")
        return value

class SeasonSerializer(serializers.ModelSerializer):
    total_views = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Season
        fields = [
            'id', 'title', 'season_number', 'description', 'release_date', 'is_public',
            'model_gltf', 'model_usdz', 'comic', 'created_at', 'updated_at', 'total_views'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_views']
    
    def validate_title(self, value):
        """Validate title length"""
        if value and len(value) > 20:
            raise serializers.ValidationError("Season title cannot exceed 50 characters.")
        return value
    
    def validate_description(self, value):
        """Validate description length"""
        if value and len(value) > 300:
            raise serializers.ValidationError("Season description cannot exceed 150 characters.")
        return value
    
    def validate_model_gltf(self, value):
        """Validate GLB file type and size"""
        if value:
            # Validate file type - only GLB files allowed
            if not value.name.lower().endswith('.glb'):
                raise serializers.ValidationError("Only GLB files are allowed. Please upload a .glb file.")
            
            # Validate file size (max 50MB)
            if value.size > 50 * 1024 * 1024:
                raise serializers.ValidationError("File size cannot exceed 50MB. Please optimize your model.")
        
        return value

class EpisodeSerializer(serializers.ModelSerializer):
    season_number = serializers.IntegerField(source='season.season_number', read_only=True)
    
    class Meta:
        model = Episode
        fields = [
            'id', 'title', 'episode_number', 'description', 'summary', 'is_published',
            'cover_image', 'season', 'season_number', 'view_count', 'last_viewed',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'season', 'view_count', 'last_viewed', 'created_at', 'updated_at']
    
    def validate_title(self, value):
        """Validate title length"""
        if value and len(value) > 20:
            raise serializers.ValidationError("Episode title cannot exceed 50 characters.")
        return value
    
    def validate_description(self, value):
        """Validate description length"""
        if value and len(value) > 300:
            raise serializers.ValidationError("Episode description cannot exceed 300 characters.")
        return value

class DialogueSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    pov_data = serializers.SerializerMethodField()
    
    class Meta:
        model = Dialogue
        fields = [
            'id', 'pov', 'pov_data', 'character', 'character_name', 'text', 'order', 'scene_title', 'scene_description',
            'shot_type', 'camera_orbit', 'camera_target', 'field_of_view', 
            'zoom_speed', 'rotation', 'episode', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'episode', 'created_at', 'updated_at']
    
    def get_pov_data(self, obj):
        """Return POV data from dialogue's POV, or fall back to character's first POV for hotspot positioning."""
        pov = obj.pov
        if not pov and obj.character:
            # Use character's first POV so head position is per-character (avoids all names at 0,0,0)
            pov = obj.character.povs.first()
        if pov:
            return {
                'id': pov.id,
                'head_x': pov.head_x,
                'head_y': pov.head_y,
                'head_z': pov.head_z,
                'default_camera_target': pov.default_camera_target,
                'character': pov.character.id if pov.character else None
            }
        return None

class CharacterSerializer(serializers.ModelSerializer):
    pov_data = serializers.SerializerMethodField()
    
    class Meta:
        model = Character
        fields = [
            'id', 'name', 'bio', 'personality', 'love_interest', 'is_public',
            'user', 'story', 'pov_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_pov_data(self, obj):
        """Return POV data if POV exists - uses prefetched data if available"""
        # Django's prefetch_related automatically uses cached data when available
        # obj.povs.first() will use prefetched cache if prefetch_related('povs') was used
        try:
            pov = obj.povs.first()
            if pov:
                return {
                    'id': pov.id,
                    'head_x': pov.head_x,
                    'head_y': pov.head_y,
                    'head_z': pov.head_z,
                    'default_camera_target': pov.default_camera_target,
                    'character': pov.character.id if pov.character else None
                }
        except Exception:
            pass
        return None

class StudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = [
            'id',
            'name',
            'description',
            'is_public',
            'avatar_url',
            'owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

class AudioTrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioTrack
        fields = [
            'id', 'name', 'file', 'duration', 'file_size', 
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


# Collaboration Serializers
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class PublicUserSerializer(serializers.ModelSerializer):
    """Subset of user fields for public studio pages (no email)."""

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = ['id', 'username', 'first_name', 'last_name']


class StudioReadSerializer(serializers.ModelSerializer):
    """Full studio read for public detail + owner's private studio (GET only)."""

    owner = PublicUserSerializer(read_only=True)
    collaborators = serializers.SerializerMethodField()

    class Meta:
        model = Studio
        fields = [
            'id',
            'name',
            'description',
            'is_public',
            'avatar_url',
            'owner',
            'collaborators',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'name',
            'description',
            'is_public',
            'avatar_url',
            'owner',
            'collaborators',
            'created_at',
            'updated_at',
        ]

    def get_collaborators(self, obj):
        rows = obj.collaborators.filter(is_active=True).select_related('user')
        return [
            {
                'id': c.id,
                'role': c.role,
                'is_active': c.is_active,
                'user': PublicUserSerializer(c.user).data,
            }
            for c in rows
        ]


class CollaborationInviteSerializer(serializers.ModelSerializer):
    inviter = UserSerializer(read_only=True)
    invitee_user = UserSerializer(read_only=True)
    story = ComicSerializer(read_only=True)
    
    class Meta:
        model = CollaborationInvite
        fields = [
            'id', 'inviter', 'invitee_email', 'invitee_user', 'story',
            'role', 'status', 'message', 'created_at', 'updated_at', 'expires_at'
        ]
        read_only_fields = ['id', 'inviter', 'created_at', 'updated_at']


class StoryCollaboratorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    invited_by = UserSerializer(read_only=True)
    story = ComicSerializer(read_only=True)
    
    class Meta:
        model = StoryCollaborator
        fields = [
            'id', 'story', 'user', 'role', 'invited_by', 'joined_at'
        ]
        read_only_fields = ['id', 'story', 'user', 'invited_by', 'joined_at']


class InviteUserSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=CollaborationInvite.ROLE_CHOICES)
    message = serializers.CharField(required=False, allow_blank=True)


class InviteEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=CollaborationInvite.ROLE_CHOICES)
    message = serializers.CharField(required=False, allow_blank=True)


class UpdateRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=CollaborationInvite.ROLE_CHOICES)


class StudioCollaboratorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    studio = StudioSerializer(read_only=True)
    
    class Meta:
        model = StudioCollaborator
        fields = [
            'id', 'studio', 'user', 'role', 'joined_at', 'is_active'
        ]
        read_only_fields = ['id', 'studio', 'user', 'joined_at']


class InviteStudioUserSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=StudioCollaborator.ROLE_CHOICES)


class InviteStudioEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=StudioCollaborator.ROLE_CHOICES)


class StudioCollaborationRequestSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    studio = StudioSerializer(read_only=True)
    
    class Meta:
        model = StudioCollaborationRequest
        fields = [
            'id', 'studio', 'requester', 'role', 'status', 'message', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'studio', 'requester', 'created_at', 'updated_at']


class CreateStudioCollaborationRequestSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=StudioCollaborator.ROLE_CHOICES, required=False)
    message = serializers.CharField(required=False, allow_blank=True)
