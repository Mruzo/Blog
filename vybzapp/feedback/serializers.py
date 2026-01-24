from rest_framework import serializers
from django.contrib.auth.models import User
from .models import FeedbackTicket, TicketComment, TicketStatusHistory


class TicketStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True)
    
    class Meta:
        model = TicketStatusHistory
        fields = ['id', 'old_status', 'new_status', 'changed_by_username', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class TicketCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.SerializerMethodField()
    author_display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketComment
        fields = ['id', 'author', 'author_username', 'author_name', 'author_email', 'author_display_name', 
                  'content', 'is_internal', 'is_staff_response', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_author_username(self, obj):
        return obj.author.username if obj.author else None
    
    def get_author_display_name(self, obj):
        if obj.author:
            return obj.author.username
        return obj.author_name or 'Anonymous'


class FeedbackTicketSerializer(serializers.ModelSerializer):
    """Serializer for ticket detail view"""
    comments = serializers.SerializerMethodField()
    status_history = TicketStatusHistorySerializer(many=True, read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    related_story_title = serializers.CharField(source='related_story.title', read_only=True)
    related_episode_title = serializers.CharField(source='related_episode.title', read_only=True)
    related_studio_name = serializers.CharField(source='related_studio.name', read_only=True)
    
    class Meta:
        model = FeedbackTicket
        fields = [
            'id', 'ticket_number', 'user', 'user_username', 'submitted_by_name', 'submitted_by_email',
            'subject', 'message', 'category', 'priority', 'status', 'assigned_to', 'assigned_to_username',
            'source', 'related_story', 'related_story_title', 'related_episode', 'related_episode_title',
            'related_studio', 'related_studio_name', 'related_order',
            'created_at', 'updated_at', 'resolved_at', 'closed_at', 'first_response_at',
            'resolution_notes', 'comments', 'status_history'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'created_at', 'updated_at', 'resolved_at', 'closed_at',
            'first_response_at', 'comments', 'status_history'
        ]
    
    def get_comments(self, obj):
        # Filter out internal comments for non-staff users
        request = self.context.get('request')
        if request and request.user and request.user.is_staff:
            # Staff can see all comments
            comments = obj.comments.all()
        else:
            # Users can only see non-internal comments
            comments = obj.comments.filter(is_internal=False)
        
        return TicketCommentSerializer(comments, many=True, context=self.context).data


class FeedbackTicketListSerializer(serializers.ModelSerializer):
    """Simplified serializer for ticket list views"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    
    class Meta:
        model = FeedbackTicket
        fields = [
            'id', 'ticket_number', 'subject', 'category', 'status', 'priority',
            'user_username', 'submitted_by_name', 'submitted_by_email',
            'assigned_to_username', 'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'ticket_number', 'created_at', 'updated_at', 'resolved_at']


class FeedbackTicketCreateSerializer(serializers.Serializer):
    """Serializer for creating new tickets"""
    submitted_by_name = serializers.CharField(max_length=100)
    submitted_by_email = serializers.EmailField()
    subject = serializers.CharField(max_length=200, min_length=3)
    message = serializers.CharField(min_length=10)
    category = serializers.ChoiceField(choices=FeedbackTicket.CATEGORY_CHOICES, default='other')
    source = serializers.ChoiceField(choices=FeedbackTicket.SOURCE_CHOICES, default='contact_form')
    
    # Optional related objects
    related_story_id = serializers.IntegerField(required=False, allow_null=True)
    related_episode_id = serializers.IntegerField(required=False, allow_null=True)
    related_studio_id = serializers.IntegerField(required=False, allow_null=True)
    related_order_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_related_story_id(self, value):
        if value:
            from icvybz.models import Comic
            try:
                Comic.objects.get(id=value)
            except Comic.DoesNotExist:
                raise serializers.ValidationError("Story not found")
        return value
    
    def validate_related_episode_id(self, value):
        if value:
            from icvybz.models import Episode
            try:
                Episode.objects.get(id=value)
            except Episode.DoesNotExist:
                raise serializers.ValidationError("Episode not found")
        return value
    
    def validate_related_studio_id(self, value):
        if value:
            from icvybz.models import Studio
            try:
                Studio.objects.get(id=value)
            except Studio.DoesNotExist:
                raise serializers.ValidationError("Studio not found")
        return value
    
    def validate_related_order_id(self, value):
        if value:
            from snmov.models import Order
            try:
                Order.objects.get(id=value)
            except Order.DoesNotExist:
                raise serializers.ValidationError("Order not found")
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        # Get user if authenticated
        user = request.user if request and request.user.is_authenticated else None
        
        # Get IP and user agent
        ip_address = None
        user_agent = None
        if request:
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Extract related object IDs
        related_story_id = validated_data.pop('related_story_id', None)
        related_episode_id = validated_data.pop('related_episode_id', None)
        related_studio_id = validated_data.pop('related_studio_id', None)
        related_order_id = validated_data.pop('related_order_id', None)
        
        # Create ticket
        ticket = FeedbackTicket.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            related_story_id=related_story_id,
            related_episode_id=related_episode_id,
            related_studio_id=related_studio_id,
            related_order_id=related_order_id,
            **validated_data
        )
        
        return ticket
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TicketCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments"""
    
    class Meta:
        model = TicketComment
        fields = ['content', 'is_internal', 'is_staff_response']
    
    def validate_is_internal(self, value):
        # Only staff can create internal comments
        request = self.context.get('request')
        if value and (not request or not request.user or not request.user.is_staff):
            raise serializers.ValidationError("Only staff can create internal comments")
        return value
    
    def validate(self, data):
        # Ensure staff_response is False if internal
        if data.get('is_internal') and data.get('is_staff_response'):
            raise serializers.ValidationError("Internal comments cannot be staff responses")
        return data
