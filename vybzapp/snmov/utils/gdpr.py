"""
GDPR / privacy compliance utilities for data export and deletion.
"""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone


def export_user_data(user):
    """
    Export all user data in JSON format (GDPR Right to Access / CCPA Right to Know).
    """
    from snmov.models import (
        Order, ShippingAddress, ReachOut, ProductNotification,
        NewsletterSubscription,
    )
    from icvybz.models import (
        Comic, StoryCollaborator, Studio, StudioCollaborator, AudioTrack,
        ComicComment,
    )

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

    orders = Order.objects.filter(customer=user).prefetch_related('orderitem_set__product')
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
        }
        for addr in addresses
    ]

    feedback = ReachOut.objects.filter(email__iexact=user.email)
    data['feedback_submissions'] = [
        {
            'subject': f.subject,
            'content': f.content,
            'created_at': f.created_at.isoformat(),
        }
        for f in feedback
    ]

    try:
        from feedback.models import FeedbackTicket
        tickets = FeedbackTicket.objects.filter(
            Q(user=user) | Q(submitted_by_email__iexact=user.email)
        )
        data['support_tickets'] = [
            {
                'ticket_number': t.ticket_number,
                'subject': t.subject,
                'category': t.category,
                'status': t.status,
                'created_at': t.created_at.isoformat(),
            }
            for t in tickets
        ]
    except Exception:
        data['support_tickets'] = []

    notifications = ProductNotification.objects.filter(email__iexact=user.email)
    data['product_notifications'] = [
        {
            'product_title': n.product.title,
            'created_at': n.created_at.isoformat(),
            'is_active': n.is_active,
        }
        for n in notifications
    ]

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
    except Exception:
        data['email_preferences'] = None

    newsletter_subs = NewsletterSubscription.objects.filter(
        Q(user=user) | Q(email__iexact=user.email)
    )
    data['newsletter_subscriptions'] = [
        {
            'email': sub.email,
            'is_active': sub.is_active,
            'subscribed_at': sub.subscribed_at.isoformat(),
        }
        for sub in newsletter_subs
    ]

    stories = Comic.objects.filter(user=user)
    data['stories'] = [
        {
            'id': story.id,
            'title': story.title,
            'description': story.description,
            'is_public': story.is_public,
            'moderation_status': story.moderation_status,
            'created_at': story.created_at.isoformat() if story.created_at else None,
        }
        for story in stories
    ]

    collaborations = StoryCollaborator.objects.filter(user=user)
    data['collaborations'] = [
        {
            'story_title': collab.story.title,
            'role': collab.role,
            'joined_at': collab.joined_at.isoformat() if collab.joined_at else None,
        }
        for collab in collaborations
    ]

    episode_comments = ComicComment.objects.filter(user_name=user).select_related(
        'episode', 'episode__season', 'episode__season__comic'
    )
    data['episode_comments'] = [
        {
            'id': comment.id,
            'content': comment.comment_cont,
            'episode_id': comment.episode_id,
            'episode_number': comment.episode.episode_number,
            'episode_title': comment.episode.title,
            'season_id': comment.episode.season_id,
            'season_number': comment.episode.season.season_number,
            'story_id': comment.episode.season.comic_id,
            'story_title': comment.episode.season.comic.title,
            'comment_date': comment.comment_date.isoformat() if comment.comment_date else None,
            'approved_comment': comment.approved_comment,
        }
        for comment in episode_comments
    ]

    studio_collabs = StudioCollaborator.objects.filter(user=user)
    data['studio_memberships'] = [
        {
            'studio_name': collab.studio.name,
            'role': collab.role,
            'joined_at': collab.joined_at.isoformat() if collab.joined_at else None,
        }
        for collab in studio_collabs
    ]

    data['owned_studios'] = [
        {'id': s.id, 'name': s.name, 'is_public': s.is_public}
        for s in Studio.objects.filter(owner=user)
    ]

    data['audio_tracks'] = [
        {'id': t.id, 'name': t.name, 'audio_type': t.audio_type}
        for t in AudioTrack.objects.filter(created_by=user)
    ]

    return data


def _detach_orders_for_erasure(user, summary):
    """Keep order records for tax/legal; remove link to the user account."""
    from snmov.models import Order

    orders = Order.objects.filter(customer=user)
    summary['orders_detached'] = orders.count()
    orders.update(customer=None, guest_email='', guest_checkout_token='')


def _delete_user_content(user, summary):
    """Delete immersive-comics UGC and related creator assets."""
    from icvybz.models import (
        Comic, Character, Studio, AudioTrack, Intersection,
        CollaborationInvite, StoryCollaborator, StudioCollaborator,
        ComicComment,
    )

    stories = Comic.objects.filter(user=user)
    summary['stories_deleted'] = stories.count()
    stories.delete()

    characters = Character.objects.filter(user=user)
    summary['characters_deleted'] = characters.count()
    characters.delete()

    studios = Studio.objects.filter(owner=user)
    summary['studios_deleted'] = studios.count()
    studios.delete()

    audio = AudioTrack.objects.filter(created_by=user)
    summary['audio_tracks_deleted'] = audio.count()
    audio.delete()

    intersections = Intersection.objects.filter(user=user)
    summary['intersections_deleted'] = intersections.count()
    intersections.delete()

    invites = CollaborationInvite.objects.filter(
        Q(inviter=user) | Q(invitee_user=user)
    )
    summary['collaboration_invites_deleted'] = invites.count()
    invites.delete()

    story_collabs = StoryCollaborator.objects.filter(user=user)
    summary['collaborations_removed'] = story_collabs.count()
    for collab in story_collabs:
        collab.is_active = False
        collab.save(update_fields=['is_active'])

    studio_collabs = StudioCollaborator.objects.filter(user=user)
    summary['studio_memberships_removed'] = studio_collabs.count()
    for collab in studio_collabs:
        collab.is_active = False
        collab.save(update_fields=['is_active'])

    comments = ComicComment.objects.filter(user_name=user)
    summary['episode_comments_deleted'] = comments.count()
    comments.delete()


def _delete_support_and_comms(user, summary):
    from snmov.models import ReachOut, ProductNotification, NewsletterSubscription

    feedback = ReachOut.objects.filter(email__iexact=user.email)
    summary['feedback_deleted'] = feedback.count()
    feedback.delete()

    try:
        from feedback.models import FeedbackTicket
        tickets = FeedbackTicket.objects.filter(
            Q(user=user) | Q(submitted_by_email__iexact=user.email)
        )
        summary['support_tickets_deleted'] = tickets.count()
        tickets.delete()
    except Exception:
        summary['support_tickets_deleted'] = 0

    notifications = ProductNotification.objects.filter(email__iexact=user.email)
    summary['notifications_deleted'] = notifications.count()
    notifications.delete()

    newsletter_subs = NewsletterSubscription.objects.filter(
        Q(user=user) | Q(email__iexact=user.email)
    )
    summary['newsletter_subscriptions_deleted'] = newsletter_subs.count()
    newsletter_subs.delete()


def delete_user_data(user, anonymize=False):
    """
    Delete or anonymize user data (GDPR Right to Erasure / CCPA Right to Delete).

    Full delete removes UGC and account data. Order line items are retained for
    legal/tax purposes but are detached from the deleted account.
    """
    from snmov.models import Order, ShippingAddress
    from rest_framework.authtoken.models import Token

    summary = {
        'user_id': user.id,
        'username': user.username,
        'anonymized': anonymize,
        'timestamp': timezone.now().isoformat(),
    }

    with transaction.atomic():
        if anonymize:
            from icvybz.models import ComicComment
            comments = ComicComment.objects.filter(user_name=user)
            summary['episode_comments_deleted'] = comments.count()
            comments.delete()

            user.username = f'deleted_user_{user.id}'
            user.email = f'deleted_{user.id}@deleted.local'
            user.first_name = ''
            user.last_name = ''
            user.set_unusable_password()
            user.is_active = False
            user.save()

            orders = Order.objects.filter(customer=user)
            for order in orders:
                if order.shipping_address:
                    order.shipping_address.full_name = '[Deleted]'
                    order.shipping_address.address_line_1 = '[Deleted]'
                    order.shipping_address.save()
            summary['orders_anonymized'] = orders.count()
            _detach_orders_for_erasure(user, summary)

            from snmov.models import ReachOut
            feedback = ReachOut.objects.filter(email__iexact=user.email)
            for f in feedback:
                f.full_name = '[Deleted]'
                f.email = f'deleted_{user.id}@deleted.local'
                f.content = '[Content deleted]'
                f.save()
            summary['feedback_anonymized'] = feedback.count()

            Token.objects.filter(user=user).delete()
            return summary

        _detach_orders_for_erasure(user, summary)
        _delete_user_content(user, summary)
        _delete_support_and_comms(user, summary)

        addresses = ShippingAddress.objects.filter(user=user)
        summary['addresses_deleted'] = addresses.count()
        addresses.delete()

        try:
            user.email_preferences.delete()
            summary['email_preferences_deleted'] = True
        except Exception:
            summary['email_preferences_deleted'] = False

        Token.objects.filter(user=user).delete()
        user.delete()
        summary['user_deleted'] = True

    return summary
