"""
GDPR compliance utilities for data export and deletion.
"""
import json
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import zipfile
import io

User = get_user_model()


def export_user_data(user):
    """
    Export all user data in JSON format (GDPR Right to Access).
    
    Args:
        user: User object
    
    Returns:
        dict: User data in structured format
    """
    from snmov.models import Order, ShippingAddress, ReachOut, ProductNotification, EmailPreference, NewsletterSubscription
    from icvybz.models import Comic, Season, Episode, Character, StoryCollaborator, CollaborationInvite, Studio, StudioCollaborator
    
    data = {
        'export_date': timezone.now().isoformat(),
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'is_email_verified': getattr(user, 'is_email_verified', False),
    }
    
    # Orders
    orders = Order.objects.filter(customer=user)
    data['orders'] = [
        {
            'id': order.id,
            'ref_code': order.ref_code,
            'status': order.status,
            'order_date': order.order_date.isoformat() if order.order_date else None,
            'shipping_cost': str(order.shipping_cost),
            'total': str(order.calculate_grand_total()),
            'items': [
                {
                    'product_title': item.product.title,
                    'quantity': item.quantity,
                    'price': str(item.product.get_discounted_price()),
                }
                for item in order.orderitem_set.all()
            ],
            'shipping_address': {
                'full_name': order.shipping_address.full_name,
                'address_line_1': order.shipping_address.address_line_1,
                'city': order.shipping_address.city,
                'state': order.shipping_address.state,
                'postal_code': order.shipping_address.postal_code,
                'country_code': order.shipping_address.country_code,
            } if order.shipping_address else None,
        }
        for order in orders
    ]
    
    # Shipping addresses
    addresses = ShippingAddress.objects.filter(user=user)
    data['shipping_addresses'] = [
        {
            'full_name': addr.full_name,
            'address_line_1': addr.address_line_1,
            'address_line_2': addr.address_line_2,
            'city': addr.city,
            'state': addr.state,
            'postal_code': addr.postal_code,
            'country_code': addr.country_code,
            'is_default': addr.is_default,
        }
        for addr in addresses
    ]
    
    # Feedback submissions
    feedback = ReachOut.objects.filter(email=user.email)
    data['feedback_submissions'] = [
        {
            'subject': f.subject,
            'content': f.content,
            'created_at': f.created_at.isoformat(),
        }
        for f in feedback
    ]
    
    # Product notifications
    notifications = ProductNotification.objects.filter(email=user.email)
    data['product_notifications'] = [
        {
            'product_title': n.product.title,
            'created_at': n.created_at.isoformat(),
            'is_active': n.is_active,
        }
        for n in notifications
    ]
    
    # Email preferences
    try:
        email_pref = user.email_preferences
        data['email_preferences'] = {
            'marketing_emails': email_pref.marketing_emails,
            'product_notifications': email_pref.product_notifications,
            'order_updates': email_pref.order_updates,
            'cart_reminders': email_pref.cart_reminders,
            'collaboration_notifications': email_pref.collaboration_notifications,
            'newsletter': email_pref.newsletter,
        }
    except:
        data['email_preferences'] = None
    
    # Newsletter subscriptions
    newsletter_subs = NewsletterSubscription.objects.filter(user=user)
    data['newsletter_subscriptions'] = [
        {
            'email': sub.email,
            'is_active': sub.is_active,
            'subscribed_at': sub.subscribed_at.isoformat(),
        }
        for sub in newsletter_subs
    ]
    
    # Stories/Comics
    stories = Comic.objects.filter(user=user)
    data['stories'] = [
        {
            'id': story.id,
            'title': story.title,
            'description': story.description,
            'is_public': story.is_public,
            'created_at': story.created_at.isoformat() if story.created_at else None,
        }
        for story in stories
    ]
    
    # Collaborations
    collaborations = StoryCollaborator.objects.filter(user=user)
    data['collaborations'] = [
        {
            'story_title': collab.story.title,
            'role': collab.role,
            'joined_at': collab.joined_at.isoformat() if collab.joined_at else None,
        }
        for collab in collaborations
    ]
    
    # Studio memberships
    studio_collabs = StudioCollaborator.objects.filter(user=user)
    data['studio_memberships'] = [
        {
            'studio_name': collab.studio.name,
            'role': collab.role,
            'joined_at': collab.joined_at.isoformat() if collab.joined_at else None,
        }
        for collab in studio_collabs
    ]
    
    return data


def delete_user_data(user, anonymize=False):
    """
    Delete or anonymize user data (GDPR Right to Erasure).
    
    Args:
        user: User object
        anonymize: If True, anonymize data instead of deleting
    
    Returns:
        dict: Summary of deleted/anonymized data
    """
    from snmov.models import Order, ShippingAddress, ReachOut, ProductNotification, EmailPreference, NewsletterSubscription
    from icvybz.models import Comic, StoryCollaborator, StudioCollaborator, CollaborationInvite
    
    summary = {
        'user_id': user.id,
        'username': user.username,
        'anonymized': anonymize,
        'timestamp': timezone.now().isoformat(),
    }
    
    if anonymize:
        # Anonymize user data
        user.username = f'deleted_user_{user.id}'
        user.email = f'deleted_{user.id}@deleted.local'
        user.first_name = ''
        user.last_name = ''
        user.set_unusable_password()
        user.is_active = False
        user.save()
        
        # Anonymize orders (keep for business records but remove personal data)
        orders = Order.objects.filter(customer=user)
        for order in orders:
            if order.shipping_address:
                order.shipping_address.full_name = '[Deleted]'
                order.shipping_address.address_line_1 = '[Deleted]'
                order.shipping_address.email = f'deleted_{user.id}@deleted.local'
                order.shipping_address.save()
        
        summary['orders_anonymized'] = orders.count()
        
        # Anonymize feedback
        feedback = ReachOut.objects.filter(email=user.email)
        for f in feedback:
            f.full_name = '[Deleted]'
            f.email = f'deleted_{user.id}@deleted.local'
            f.content = '[Content deleted]'
            f.save()
        summary['feedback_anonymized'] = feedback.count()
        
    else:
        # Delete user data (where allowed by business requirements)
        # Note: Orders may need to be kept for tax/legal purposes
        
        # Delete shipping addresses
        addresses = ShippingAddress.objects.filter(user=user)
        summary['addresses_deleted'] = addresses.count()
        addresses.delete()
        
        # Delete feedback
        feedback = ReachOut.objects.filter(email=user.email)
        summary['feedback_deleted'] = feedback.count()
        feedback.delete()
        
        # Delete product notifications
        notifications = ProductNotification.objects.filter(email=user.email)
        summary['notifications_deleted'] = notifications.count()
        notifications.delete()
        
        # Delete email preferences
        try:
            user.email_preferences.delete()
            summary['email_preferences_deleted'] = True
        except:
            summary['email_preferences_deleted'] = False
        
        # Delete newsletter subscriptions
        newsletter_subs = NewsletterSubscription.objects.filter(user=user)
        summary['newsletter_subscriptions_deleted'] = newsletter_subs.count()
        newsletter_subs.delete()
        
        # Remove from collaborations (soft delete)
        collaborations = StoryCollaborator.objects.filter(user=user)
        for collab in collaborations:
            collab.is_active = False
            collab.save()
        summary['collaborations_removed'] = collaborations.count()
        
        # Remove from studios (soft delete)
        studio_collabs = StudioCollaborator.objects.filter(user=user)
        for collab in studio_collabs:
            collab.is_active = False
            collab.save()
        summary['studio_memberships_removed'] = studio_collabs.count()
        
        # Delete user account
        user.delete()
        summary['user_deleted'] = True
    
    return summary




