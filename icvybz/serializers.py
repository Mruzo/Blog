from rest_framework import serializers
from .models import Comic, Season, Episode, Dialogue, Character, Studio, AudioTrack, CollaborationInvite, StoryCollaborator
from django.contrib.auth.models import User

class ComicSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Comic
        fields = [
            'id', 'title', 'description', 'comic_image', 'is_public', 'moderation_status',
            'created_at', 'updated_at', 'user', 'user_username'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']

class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = [
            'id', 'title', 'season_number', 'description', 'release_date',
            'model_gltf', 'model_usdz', 'comic', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class EpisodeSerializer(serializers.ModelSerializer):
    season_number = serializers.IntegerField(source='season.season_number', read_only=True)
    
    class Meta:
        model = Episode
        fields = [
            'id', 'title', 'episode_number', 'description', 'summary', 'is_published',
            'cover_image', 'season', 'season_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'season', 'created_at', 'updated_at']

class DialogueSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    
    class Meta:
        model = Dialogue
        fields = [
            'id', 'character', 'character_name', 'text', 'order', 'scene_title', 'scene_description',
            'shot_type', 'camera_orbit', 'camera_target', 'field_of_view', 
            'zoom_speed', 'rotation', 'episode', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'episode', 'created_at', 'updated_at']

class CharacterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Character
        fields = [
            'id', 'name', 'bio', 'personality', 'love_interest', 'is_public',
            'user', 'story', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class StudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = [
            'id', 'name', 'description', 'is_public', 
            'owner', 'created_at', 'updated_at'
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
