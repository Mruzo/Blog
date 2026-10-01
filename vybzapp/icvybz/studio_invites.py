from urllib.parse import quote

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.mail import send_mail
from django.template.loader import render_to_string


def _studio_invite_urls(studio, invitee_email=None):
    current_site = Site.objects.get_current()
    site_url = f"https://{current_site.domain}"
    frontend_url = getattr(settings, 'FRONTEND_URL', site_url).rstrip('/')
    studio_url = f"{frontend_url}/immersivecomics/studio/{studio.id}/"
    register_url = f"{frontend_url}/register/"
    if invitee_email:
        next_path = f"/immersivecomics/studio/{studio.id}/"
        register_url = (
            f"{register_url}?email={quote(invitee_email)}"
            f"&next={quote(next_path)}"
        )
    return site_url, studio_url, register_url


def send_studio_invitation_email(
    *,
    inviter,
    studio,
    role_display,
    recipient_email,
    invitee_user=None,
    is_registration=False,
):
    site_url, studio_url, register_url = _studio_invite_urls(
        studio,
        invitee_email=recipient_email if is_registration else None,
    )
    context = {
        'invitee_user': invitee_user,
        'inviter': inviter,
        'studio': studio,
        'role_display': role_display,
        'studio_url': studio_url,
        'register_url': register_url,
        'site_url': site_url,
        'is_registration': is_registration,
    }
    html_message = render_to_string('emails/studio_invitation.html', context)
    plain_message = render_to_string('emails/studio_invitation.txt', context)
    send_mail(
        subject=f"Studio Collaboration Invitation: {studio.name}",
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        html_message=html_message,
        fail_silently=False,
    )


def apply_pending_studio_invites(user):
    """Turn pending email invites into studio roles when that address registers."""
    from .models import StudioCollaborationInvite, StudioCollaborator

    email = (getattr(user, 'email', None) or '').strip()
    if not email:
        return 0

    invites = StudioCollaborationInvite.objects.filter(
        invitee_email__iexact=email,
        status='pending',
    ).select_related('studio')
    applied = 0
    for invite in invites:
        collaborator, created = StudioCollaborator.objects.get_or_create(
            studio=invite.studio,
            user=user,
            role=invite.role,
            defaults={'is_active': True},
        )
        if not created and not collaborator.is_active:
            collaborator.is_active = True
            collaborator.removed_at = None
            collaborator.save(update_fields=['is_active', 'removed_at'])
        invite.status = 'accepted'
        invite.save(update_fields=['status', 'updated_at'])
        applied += 1
    return applied
