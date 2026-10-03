"""Episode snapshots and activity summaries for story team members."""

import logging

from django.db import transaction
from django.db.models import Q

from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import (
    Character,
    Comic,
    Dialogue,
    DialogueEditRequest,
    EpisodeVersion,
    POV,
    StoryChange,
    StoryCollaborator,
    Studio,
    StudioCollaborator,
)

logger = logging.getLogger(__name__)

MAX_EPISODE_VERSIONS = 25
MAX_NAME_LENGTH = 80
VIEWER_ONLY_ROLES = {'viewer'}

DIALOGUE_SNAPSHOT_FIELDS = (
    'order',
    'text',
    'scene_title',
    'scene_description',
    'character_id',
    'pov_id',
    'shot_type',
    'camera_orbit',
    'camera_target',
    'field_of_view',
    'zoom_speed',
    'camera_transition',
    'rotation',
)


def _user_is_studio_member(user, story):
    if story.studio_id:
        return StudioCollaborator.objects.filter(
            studio_id=story.studio_id, user=user, is_active=True
        ).exists()
    return StudioCollaborator.objects.filter(
        studio__owner_id=story.user_id, user=user, is_active=True
    ).exists()


def user_can_view_story(user, story):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if story.user_id == user.id:
        return True
    if StoryCollaborator.objects.filter(story=story, user=user, is_active=True).exists():
        return True
    return _user_is_studio_member(user, story)


def user_can_edit_story(user, story):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if story.user_id == user.id:
        return True
    roles = set(
        StoryCollaborator.objects.filter(story=story, user=user, is_active=True).values_list(
            'role', flat=True
        )
    )
    if roles - VIEWER_ONLY_ROLES:
        return True
    if roles & VIEWER_ONLY_ROLES:
        return False
    return _user_is_studio_member(user, story)


def stories_visible_to_user(user):
    """Stories a signed-in user can open in the workspace, including drafts."""
    if not user or not getattr(user, 'is_authenticated', False):
        return Comic.objects.none()
    member_studio_ids = StudioCollaborator.objects.filter(
        user=user, is_active=True
    ).values('studio_id')
    studio_owner_ids = Studio.objects.filter(id__in=member_studio_ids).values('owner_id')
    visible_ids = Comic.objects.filter(
        Q(user=user)
        | Q(collaborators__user=user, collaborators__is_active=True)
        | Q(studio_id__in=member_studio_ids)
        | Q(studio__isnull=True, user_id__in=studio_owner_ids)
    ).values('id')
    return Comic.objects.filter(id__in=visible_ids)


def _who(user):
    if not user:
        return 'Someone'
    return user.get_username() or 'Someone'


def _clip(text, limit=40):
    cleaned = ' '.join((text or '').split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1] + '…'


def log_story_change(
    *,
    story,
    user,
    action,
    summary,
    episode=None,
    target_type='dialogue',
    target_id=None,
):
    if not story or not summary:
        return None
    return StoryChange.objects.create(
        story=story,
        episode=episode,
        user=user if getattr(user, 'is_authenticated', False) else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        summary=_clip(summary, 240),
    )


def log_dialogue_create(user, dialogue):
    story = _story_for_dialogue(dialogue)
    if not story:
        return None
    speaker = dialogue.character.name if dialogue.character_id else ''
    summary = f"{_who(user)} added line {dialogue.order}"
    if speaker:
        summary = f"{summary} · {speaker}"
    return log_story_change(
        story=story,
        episode=dialogue.episode,
        user=user,
        action='create',
        summary=summary,
        target_type='dialogue',
        target_id=dialogue.id,
    )


def log_dialogue_update(user, dialogue, previous):
    story = _story_for_dialogue(dialogue)
    if not story:
        return None
    summary = _dialogue_update_summary(user, dialogue, previous or {})
    return log_story_change(
        story=story,
        episode=dialogue.episode,
        user=user,
        action='update',
        summary=summary,
        target_type='dialogue',
        target_id=dialogue.id,
    )


def log_dialogue_delete(user, dialogue):
    story = _story_for_dialogue(dialogue)
    if not story:
        return None
    speaker = dialogue.character.name if dialogue.character_id else ''
    summary = f"{_who(user)} deleted line {dialogue.order}"
    if speaker:
        summary = f"{summary} · {speaker}"
    return log_story_change(
        story=story,
        episode=dialogue.episode,
        user=user,
        action='delete',
        summary=summary,
        target_type='dialogue',
        target_id=dialogue.id,
    )


def log_episode_update(user, episode, previous):
    story = _story_for_episode(episode)
    if not story:
        return None
    bits = []
    previous = previous or {}
    if previous.get('title') != episode.title:
        bits.append(f"title to “{_clip(episode.title, 24)}”")
    if previous.get('is_published') != episode.is_published:
        bits.append('published' if episode.is_published else 'unpublished')
    if previous.get('description') != episode.description:
        bits.append('description')
    if previous.get('summary') != episode.summary:
        bits.append('summary')
    if not bits:
        return None
    return log_story_change(
        story=story,
        episode=episode,
        user=user,
        action='update',
        summary=f"{_who(user)} updated episode ({', '.join(bits)})",
        target_type='episode',
        target_id=episode.id,
    )


def serialize_episode_script(episode):
    dialogues = list(
        Dialogue.objects.filter(episode=episode).order_by('order', 'id').values(*DIALOGUE_SNAPSHOT_FIELDS)
    )
    return {
        'episode': {
            'title': episode.title,
            'description': episode.description,
            'summary': episode.summary,
        },
        'dialogues': dialogues,
    }


def create_episode_version(episode, user, name):
    label = (name or '').strip()
    if not label:
        raise ValueError('Name this version so the team can find it later.')
    if len(label) > MAX_NAME_LENGTH:
        raise ValueError(f'Version name must be {MAX_NAME_LENGTH} characters or fewer.')

    story = _story_for_episode(episode)
    version = EpisodeVersion.objects.create(
        episode=episode,
        story=story,
        created_by=user if getattr(user, 'is_authenticated', False) else None,
        name=label,
        payload=serialize_episode_script(episode),
    )
    stale_ids = list(
        EpisodeVersion.objects.filter(episode=episode)
        .order_by('-created_at', '-id')
        .values_list('id', flat=True)[MAX_EPISODE_VERSIONS:]
    )
    if stale_ids:
        EpisodeVersion.objects.filter(id__in=stale_ids).delete()

    log_story_change(
        story=story,
        episode=episode,
        user=user,
        action='snapshot',
        summary=f"{_who(user)} saved version “{_clip(label, 48)}”",
        target_type='version',
        target_id=version.id,
    )
    return version


@transaction.atomic
def restore_episode_version(episode, version, user):
    if version.episode_id != episode.id:
        raise ValueError('That version belongs to a different episode.')

    payload = version.payload or {}
    ep_data = payload.get('episode') or {}
    for field in ('title', 'description', 'summary'):
        if field in ep_data:
            setattr(episode, field, ep_data.get(field) or '')
    episode.save(update_fields=['title', 'description', 'summary', 'updated_at'])

    lines = payload.get('dialogues') or []
    character_ids = {line.get('character_id') for line in lines if line.get('character_id')}
    pov_ids = {line.get('pov_id') for line in lines if line.get('pov_id')}
    valid_characters = set(Character.objects.filter(id__in=character_ids).values_list('id', flat=True))
    valid_povs = set(POV.objects.filter(id__in=pov_ids).values_list('id', flat=True))

    Dialogue.objects.filter(episode=episode).delete()
    for line in lines:
        character_id = line.get('character_id') if line.get('character_id') in valid_characters else None
        pov_id = line.get('pov_id') if line.get('pov_id') in valid_povs else None
        Dialogue.objects.create(
            episode=episode,
            order=line.get('order') or 1,
            text=line.get('text') or '',
            scene_title=line.get('scene_title') or '',
            scene_description=line.get('scene_description') or '',
            character_id=character_id,
            pov_id=pov_id,
            shot_type=line.get('shot_type') or 'mediumShot',
            camera_orbit=line.get('camera_orbit') or '0deg 75deg 3m',
            camera_target=line.get('camera_target') or '',
            field_of_view=line.get('field_of_view') if line.get('field_of_view') is not None else 45.0,
            zoom_speed=line.get('zoom_speed') if line.get('zoom_speed') is not None else 1.0,
            camera_transition=line.get('camera_transition') or 'move',
            rotation=line.get('rotation') or '0deg 0deg 0deg',
        )

    story = _story_for_episode(episode)
    log_story_change(
        story=story,
        episode=episode,
        user=user,
        action='restore',
        summary=f"{_who(user)} restored “{_clip(version.name, 48)}”",
        target_type='version',
        target_id=version.id,
    )
    return episode


def _story_for_episode(episode):
    if not episode:
        return None
    season = getattr(episode, 'season', None)
    return getattr(season, 'comic', None) if season else None


def _story_for_dialogue(dialogue):
    return _story_for_episode(getattr(dialogue, 'episode', None))


def _dialogue_update_summary(user, dialogue, previous):
    who = _who(user)
    order = previous.get('order', dialogue.order)
    prefix = f"{who} updated line {order}"
    if previous.get('camera_transition') != dialogue.camera_transition:
        label = 'Snap' if dialogue.camera_transition == 'snap' else 'Move'
        return f"{who} set line {order} camera to {label}"
    if previous.get('character_id') != dialogue.character_id:
        speaker = dialogue.character.name if dialogue.character_id else 'no speaker'
        return f"{who} set line {order} speaker to {speaker}"
    if previous.get('text') != dialogue.text:
        return f"{prefix}: “{_clip(dialogue.text)}”"
    return prefix


def dialogue_approver(dialogue, requester=None):
    """Who must approve this save.

    The story owner can always apply. Teammates always wait on the owner.
    """
    story = _story_for_dialogue(dialogue)
    owner = getattr(story, 'user', None) if story else None
    if owner is not None:
        return owner
    return dialogue.last_edited_by


def can_apply_dialogue_edit(user, dialogue):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    approver = dialogue_approver(dialogue, requester=user)
    return bool(approver and approver.id == user.id)


def mark_dialogue_editor(dialogue, user):
    if not user or not getattr(user, 'is_authenticated', False):
        return dialogue
    if dialogue.last_edited_by_id != user.id:
        dialogue.last_edited_by = user
        dialogue.save(update_fields=['last_edited_by'])
    return dialogue


def approval_required_payload(dialogue, requester=None):
    editor = dialogue_approver(dialogue, requester=requester)
    name = editor.get_username() if editor else 'the last editor'
    pending = dialogue.edit_requests.filter(status='pending').select_related('requester', 'approver').first()
    return {
        'needs_approval': True,
        'last_editor_username': name,
        'pending_request_id': pending.id if pending else None,
        'detail': (
            f'{name} already has a change waiting on this line.'
            if pending
            else f'Send this change to {name} for approval?'
        ),
    }


def json_ready_payload(validated):
    ready = {}
    for key, value in (validated or {}).items():
        if hasattr(value, 'pk'):
            ready[key] = value.pk
        else:
            ready[key] = value
    return ready


def request_dialogue_edit(dialogue, user, *, action='update', payload=None):
    story = _story_for_dialogue(dialogue)
    if not story:
        raise ValueError('This line is not on a story.')
    approver = dialogue_approver(dialogue, requester=user)
    if can_apply_dialogue_edit(user, dialogue):
        raise ValueError('You can save this line without approval.')
    if not approver:
        raise ValueError('This line does not need approval.')

    pending = dialogue.edit_requests.filter(status='pending').select_related('requester', 'approver').first()
    if pending and pending.requester_id != user.id:
        raise ValueError(
            f'{_who(pending.approver)} already has a change from {_who(pending.requester)} waiting on this line.'
        )

    if action == 'delete':
        summary = f"{_who(user)} wants to delete line {dialogue.order}"
    else:
        summary = f"{_who(user)} wants to change line {dialogue.order}"

    if pending:
        pending.action = action
        pending.payload = payload or {}
        pending.summary = _clip(summary, 240)
        pending.save(update_fields=['action', 'payload', 'summary'])
        request = pending
    else:
        request = DialogueEditRequest.objects.create(
            story=story,
            episode=dialogue.episode,
            dialogue=dialogue,
            requester=user,
            approver=approver,
            action=action,
            payload=payload or {},
            summary=_clip(summary, 240),
        )
        log_story_change(
            story=story,
            episode=dialogue.episode,
            user=user,
            action='request',
            summary=summary,
            target_type='edit_request',
            target_id=request.id,
        )
        _notify_edit_approver(request)

    return request


def user_can_resolve_edit_request(user, request):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if request.approver_id == user.id:
        return True
    story = request.story
    return bool(story and story.user_id == user.id)


@transaction.atomic
def approve_dialogue_edit(request, user):
    if request.status != 'pending':
        raise ValueError('This request is no longer pending.')
    if not user_can_resolve_edit_request(user, request):
        raise PermissionError('Only the story owner can approve this change.')

    dialogue = request.dialogue
    if not dialogue:
        raise ValueError('That line is gone.')
    previous = {
        'order': dialogue.order,
        'text': dialogue.text,
        'camera_transition': dialogue.camera_transition,
        'character_id': dialogue.character_id,
    }
    if request.action == 'delete':
        log_dialogue_delete(request.requester, dialogue)
        request.dialogue = None
        dialogue.delete()
    else:
        _apply_dialogue_payload(dialogue, request.payload or {})
        mark_dialogue_editor(dialogue, request.requester)
        dialogue.refresh_from_db()
        log_dialogue_update(request.requester, dialogue, previous)

    request.status = 'approved'
    request.resolved_at = timezone.now()
    request.save(update_fields=['status', 'resolved_at'])
    log_story_change(
        story=request.story,
        episode=request.episode,
        user=user,
        action='approve',
        summary=f"{_who(user)} approved {_who(request.requester)}’s change to line {previous['order']}",
        target_type='edit_request',
        target_id=request.id,
    )
    return request


def decline_dialogue_edit(request, user):
    if request.status != 'pending':
        raise ValueError('This request is no longer pending.')
    if not user_can_resolve_edit_request(user, request):
        raise PermissionError('Only the story owner can decline this change.')

    request.status = 'declined'
    request.resolved_at = timezone.now()
    request.save(update_fields=['status', 'resolved_at'])
    log_story_change(
        story=request.story,
        episode=request.episode,
        user=user,
        action='decline',
        summary=f"{_who(user)} declined {_who(request.requester)}’s change to line {request.dialogue.order if request.dialogue_id else '?'}",
        target_type='edit_request',
        target_id=request.id,
    )
    return request


def _apply_dialogue_payload(dialogue, payload):
    for key, value in payload.items():
        if key in ('character', 'character_id'):
            dialogue.character_id = value or None
        elif key in ('pov', 'pov_id'):
            dialogue.pov_id = value or None
        elif key in ('episode', 'id', 'last_edited_by'):
            continue
        elif hasattr(dialogue, key):
            setattr(dialogue, key, value)
    dialogue.save()


def _notify_edit_approver(request):
    approver = request.approver
    email = getattr(approver, 'email', '') or ''
    if not email:
        return False
    story = request.story
    episode = request.episode
    season = getattr(episode, 'season', None)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.justvybz.com')
    review_url = frontend_url
    if season:
        review_url = f"{frontend_url}/immersivecomics/season/{season.id}/episodes/"
    context = {
        'approver_name': _who(approver),
        'requester_name': _who(request.requester),
        'story_title': story.title if story else 'a story',
        'episode_title': episode.title if episode else 'an episode',
        'summary': request.summary,
        'review_url': review_url,
    }
    try:
        send_mail(
            subject=f"{_who(request.requester)} wants to change a line in {context['story_title']}",
            message=render_to_string('emails/dialogue_edit_approval.txt', context),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=render_to_string('emails/dialogue_edit_approval.html', context),
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception('Failed to email dialogue edit approver %s', email)
        return False
