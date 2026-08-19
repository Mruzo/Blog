from rest_framework import serializers
from django.core import signing
from .models import (
    Comic, Season, Episode, Dialogue, Character, Studio, AudioTrack,
    CollaborationInvite, StoryCollaborator, StudioCollaborator,
    StudioCollaborationRequest, ComicComment, AdvertiserProfile,
    AdCampaign, AdCreative, AdPlacement, AdEvent, AdRevenueSplitConfig,
)
from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, OuterRef, Q, Sum

User = get_user_model()


DEFAULT_MODEL_STORY_TITLE = 'Corners of Fate'


def _normalize_url(value):
    value = (value or '').strip()
    if not value:
        return value
    if '://' in value:
        return value
    return f'https://{value}'


def _file_url(file_field, request=None):
    if not file_field:
        return None
    try:
        url = file_field.url
    except ValueError:
        return None
    if request and url and not url.startswith(('http://', 'https://')):
        return request.build_absolute_uri(url)
    return url


def get_default_model_season(model_field='model_gltf'):
    """Return the Season used as the shared platform 3D model source."""
    return (
        Season.objects.filter(
            comic__title__iexact=DEFAULT_MODEL_STORY_TITLE,
            **{f'{model_field}__isnull': False},
        )
        .exclude(**{model_field: ''})
        .order_by(
            '-comic__user__is_superuser',
            '-comic__user__is_staff',
            'comic__created_at',
            'season_number',
            'id',
        )
        .first()
    )


def get_default_model_urls(request=None):
    """URLs for the shared JustVybz / Corners of Fate 3D model."""
    gltf_season = get_default_model_season('model_gltf')
    usdz_season = get_default_model_season('model_usdz')
    return {
        'model_gltf': _file_url(getattr(gltf_season, 'model_gltf', None), request) if gltf_season else None,
        'model_usdz': _file_url(getattr(usdz_season, 'model_usdz', None), request) if usdz_season else None,
        'source_story_title': DEFAULT_MODEL_STORY_TITLE,
    }


class ComicSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    total_views = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Comic
        fields = [
            'id', 'title', 'description', 'comic_image', 'is_public', 'moderation_status',
            'created_at', 'updated_at', 'user', 'studio', 'user_username', 'total_views'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'studio', 'total_views', 'moderation_status']
    
    def validate_title(self, value):
        """Validate title length and presence."""
        if not value or not str(value).strip():
            raise serializers.ValidationError("Story title is required.")
        if len(value) > 50:
            raise serializers.ValidationError("Story title cannot exceed 50 characters.")
        return value
    
    def validate_description(self, value):
        """Validate description length"""
        if value and len(value) > 300:
            raise serializers.ValidationError("Story description cannot exceed 300 characters.")
        return value

class SeasonSerializer(serializers.ModelSerializer):
    total_views = serializers.IntegerField(read_only=True)
    resolved_model_gltf = serializers.SerializerMethodField()
    resolved_model_usdz = serializers.SerializerMethodField()
    
    class Meta:
        model = Season
        fields = [
            'id', 'title', 'season_number', 'description', 'release_date', 'is_public',
            'model_gltf', 'model_usdz', 'resolved_model_gltf', 'resolved_model_usdz',
            'comic', 'created_at', 'updated_at', 'total_views'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'resolved_model_gltf',
            'resolved_model_usdz', 'total_views'
        ]

    def _default_model_season(self, model_field):
        cache_key = f'_default_model_season_{model_field}'
        if not hasattr(self, cache_key):
            setattr(self, cache_key, get_default_model_season(model_field))
        return getattr(self, cache_key)

    def _resolved_model_url(self, obj, model_field):
        request = self.context.get('request')
        season_file = getattr(obj, model_field, None)
        if season_file:
            return _file_url(season_file, request)

        default_season = self._default_model_season(model_field)
        if not default_season:
            return None
        return _file_url(getattr(default_season, model_field, None), request)

    def get_resolved_model_gltf(self, obj):
        return self._resolved_model_url(obj, 'model_gltf')

    def get_resolved_model_usdz(self, obj):
        return self._resolved_model_url(obj, 'model_usdz')

    def _validate_custom_model_upload_enabled(self):
        request = self.context.get('request')
        if request and not getattr(request.user, 'is_superuser', False):
            raise serializers.ValidationError(
                "Custom model uploads are not available yet. Seasons use the shared default model."
            )
    
    def validate_title(self, value):
        """Validate title length (model max_length=100; wizard allows up to 50)."""
        if value and len(value) > 100:
            raise serializers.ValidationError("Season title cannot exceed 100 characters.")
        return value
    
    def validate_description(self, value):
        """Validate description length"""
        if value and len(value) > 150:
            raise serializers.ValidationError("Season description cannot exceed 150 characters.")
        return value
    
    def validate_model_gltf(self, value):
        """Validate GLB file type and size"""
        if value:
            self._validate_custom_model_upload_enabled()

            # Validate file type - only GLB files allowed
            if not value.name.lower().endswith('.glb'):
                raise serializers.ValidationError("Only GLB files are allowed. Please upload a .glb file.")
            
            # Validate file size (max 50MB)
            if value.size > 50 * 1024 * 1024:
                raise serializers.ValidationError("File size cannot exceed 50MB. Please optimize your model.")
        
        return value

    def validate_model_usdz(self, value):
        """Validate USDZ file type and size"""
        if value:
            self._validate_custom_model_upload_enabled()

            if not value.name.lower().endswith('.usdz'):
                raise serializers.ValidationError("Only USDZ files are allowed. Please upload a .usdz file.")

            if value.size > 25 * 1024 * 1024:
                raise serializers.ValidationError("File size cannot exceed 25MB. Please optimize your model.")

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


class ComicCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user_name.username', read_only=True)
    episode_number = serializers.IntegerField(source='episode.episode_number', read_only=True)
    episode_title = serializers.CharField(source='episode.title', read_only=True)
    season = serializers.IntegerField(source='episode.season_id', read_only=True)

    class Meta:
        model = ComicComment
        fields = [
            'id', 'comment_cont', 'user_name', 'username', 'episode',
            'episode_number', 'episode_title', 'season', 'comment_date',
            'approved_comment'
        ]
        read_only_fields = [
            'id', 'user_name', 'username', 'episode', 'episode_number',
            'episode_title', 'season', 'comment_date', 'approved_comment'
        ]

    def validate_comment_cont(self, value):
        text = (value or '').strip()
        if not text:
            raise serializers.ValidationError("Comment cannot be empty.")
        if len(text) > 500:
            raise serializers.ValidationError("Comment cannot exceed 500 characters.")
        return text

class CharacterSerializer(serializers.ModelSerializer):
    pov_data = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'bio', 'personality', 'love_interest', 'is_public',
            'user', 'story', 'scene_slot', 'pov_data', 'created_at', 'updated_at'
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

    def validate_scene_slot(self, value):
        from .scene_slots import SCENE_SLOT_KEYS

        if value in (None, ''):
            return None
        if value not in SCENE_SLOT_KEYS:
            raise serializers.ValidationError(
                f'Invalid scene slot. Choose one of: {", ".join(SCENE_SLOT_KEYS)}.'
            )
        return value

    def validate(self, attrs):
        from .scene_slots import MAX_CHARACTERS_PER_STORY

        attrs = super().validate(attrs)
        is_create = self.instance is None
        scene_slot = attrs.get('scene_slot', serializers.empty)
        if scene_slot is serializers.empty:
            resolved_slot = None if is_create else self.instance.scene_slot
        else:
            resolved_slot = scene_slot

        story = attrs.get('story')
        if story is None and self.instance is not None:
            story = self.instance.story
        story_id = getattr(story, 'id', story)
        if story_id is None:
            story_id = self.context.get('story_id')

        if is_create and story_id:
            existing_count = Character.objects.filter(story_id=story_id).count()
            if existing_count >= MAX_CHARACTERS_PER_STORY:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'Stories can have at most {MAX_CHARACTERS_PER_STORY} characters.'
                    ],
                })
            # scene_slot is required for new cast members in the UI; API allows omit for
            # legacy imports. When provided it must be unique (checked below).

        if resolved_slot and story_id:
            conflict = Character.objects.filter(story_id=story_id, scene_slot=resolved_slot)
            if self.instance is not None:
                conflict = conflict.exclude(pk=self.instance.pk)
            if conflict.exists():
                raise serializers.ValidationError({
                    'scene_slot': f'{resolved_slot} is already used by another character in this story.',
                })

        return attrs

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


class AdvertiserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdvertiserProfile
        fields = [
            'id', 'user', 'business_name', 'contact_name', 'contact_email',
            'website_url', 'notes', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']

    def validate_website_url(self, value):
        return _normalize_url(value)


class AdCampaignSerializer(serializers.ModelSerializer):
    advertiser_name = serializers.CharField(source='advertiser.business_name', read_only=True)

    class Meta:
        model = AdCampaign
        fields = [
            'id', 'advertiser', 'advertiser_name', 'name', 'start_date', 'end_date',
            'is_active', 'budget_label', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'advertiser', 'advertiser_name', 'created_at', 'updated_at']


class AdCreativeSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    advertiser_name = serializers.CharField(source='advertiser.business_name', read_only=True)

    class Meta:
        model = AdCreative
        fields = [
            'id', 'advertiser', 'advertiser_name', 'campaign', 'title', 'image',
            'image_url', 'destination_url', 'alt_text', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'advertiser', 'advertiser_name', 'image_url', 'status',
            'created_at', 'updated_at'
        ]

    def get_image_url(self, obj):
        return _file_url(obj.image, self.context.get('request'))

    def validate_destination_url(self, value):
        return _normalize_url(value)


class AdPlacementSerializer(serializers.ModelSerializer):
    creative_title = serializers.CharField(source='creative.title', read_only=True)
    creative_image_url = serializers.SerializerMethodField()
    destination_url = serializers.URLField(source='creative.destination_url', read_only=True)
    alt_text = serializers.CharField(source='creative.alt_text', read_only=True)
    advertiser_name = serializers.CharField(source='creative.advertiser.business_name', read_only=True)
    event_token = serializers.SerializerMethodField()

    class Meta:
        model = AdPlacement
        fields = [
            'id', 'season', 'episode', 'campaign', 'creative', 'creative_title',
            'creative_image_url', 'destination_url', 'alt_text', 'advertiser_name',
            'event_token',
            'name', 'slot_name', 'position_x', 'position_y', 'position_z', 'normal_x', 'normal_y',
            'normal_z', 'width', 'height', 'rotation', 'priority', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'season', 'creative_title', 'creative_image_url', 'destination_url', 'event_token',
            'alt_text', 'advertiser_name', 'created_at', 'updated_at'
        ]

    def get_creative_image_url(self, obj):
        return _file_url(obj.creative.image, self.context.get('request')) if obj.creative else None

    def get_event_token(self, obj):
        request = self.context.get('request')
        episode_id = None
        if request:
            episode_id = request.query_params.get('episode')
        episode_id = episode_id or obj.episode_id
        if not episode_id:
            return None
        return signing.dumps(
            {
                'placement': obj.id,
                'episode': int(episode_id),
                'creative': obj.creative_id,
            },
            salt='icvybz.ad-event',
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        creative = attrs.get('creative') or getattr(self.instance, 'creative', None)
        campaign = attrs.get('campaign') or getattr(self.instance, 'campaign', None)
        season = attrs.get('season') or getattr(self.instance, 'season', None) or self.context.get('season')
        episode = attrs.get('episode') if 'episode' in attrs else getattr(self.instance, 'episode', None)

        if creative and campaign and creative.campaign_id and creative.campaign_id != campaign.id:
            raise serializers.ValidationError("Creative does not belong to the selected campaign.")
        if creative and campaign and creative.advertiser_id != campaign.advertiser_id:
            raise serializers.ValidationError("Creative advertiser must match campaign advertiser.")
        if season and episode and episode.season_id != season.id:
            raise serializers.ValidationError("Episode must belong to the placement season.")
        return attrs


class AdEventSerializer(serializers.ModelSerializer):
    event_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = AdEvent
        fields = [
            'id', 'placement', 'creative', 'episode', 'story', 'event_type',
            'session_key', 'event_token', 'ip_hash', 'user_agent_hash',
            'is_suspicious', 'fraud_reason', 'created_at'
        ]
        read_only_fields = [
            'id', 'creative', 'story', 'ip_hash', 'user_agent_hash',
            'is_suspicious', 'fraud_reason', 'created_at'
        ]


class AdRevenueSplitConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdRevenueSplitConfig
        fields = [
            'id', 'creator_percentage', 'platform_percentage', 'effective_date',
            'is_active', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


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
    stories_count = serializers.SerializerMethodField()
    total_episode_views = serializers.SerializerMethodField()
    total_comments = serializers.SerializerMethodField()

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
            'stories_count',
            'total_episode_views',
            'total_comments',
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
            'stories_count',
            'total_episode_views',
            'total_comments',
            'created_at',
            'updated_at',
        ]

    def _public_story_queryset(self, obj):
        public_content = Season.objects.filter(
            comic_id=OuterRef('pk'),
            is_public=True,
            episodes__is_published=True,
        )
        return (
            Comic.objects.filter(
                studio=obj,
                is_public=True,
                moderation_status='approved',
            )
            .annotate(_has_public_content=Exists(public_content))
            .filter(_has_public_content=True)
        )

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

    def get_stories_count(self, obj):
        return self._public_story_queryset(obj).count()

    def get_total_episode_views(self, obj):
        result = self._public_story_queryset(obj).aggregate(
            total=Sum(
                'seasons__episodes__view_count',
                filter=Q(seasons__is_public=True, seasons__episodes__is_published=True),
                default=0,
            )
        )
        return result['total'] or 0

    def get_total_comments(self, obj):
        result = self._public_story_queryset(obj).aggregate(
            total=Count(
                'seasons__episodes__comments',
                filter=(
                    Q(seasons__is_public=True)
                    & Q(seasons__episodes__is_published=True)
                    & Q(seasons__episodes__comments__approved_comment=True)
                ),
                distinct=True,
            )
        )
        return result['total'] or 0


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
