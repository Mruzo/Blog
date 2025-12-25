#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snm.settings.local')
django.setup()

from icvybz.models import Comic, StoryCollaborator, CollaborationInvite

story_id = 43
try:
    story = Comic.objects.get(id=story_id)
    print(f'Story: {story.title}')
    print(f'Public: {story.is_public}')
    print()
    
    # Check StoryCollaborators
    collaborators = StoryCollaborator.objects.filter(story=story)
    print(f'StoryCollaborators: {collaborators.count()}')
    for c in collaborators:
        print(f'  - {c.user.username} ({c.role}) - Active: {c.is_active} - Joined: {c.joined_at}')
    
    # Check CollaborationInvites
    invites = CollaborationInvite.objects.filter(story=story)
    print(f'\nCollaborationInvites: {invites.count()}')
    for i in invites:
        invitee = i.invitee_user.username if i.invitee_user else i.invitee_email
        print(f'  - {invitee} - Status: {i.status}')
    
    # Check active collaborators only
    active_collaborators = StoryCollaborator.objects.filter(story=story, is_active=True)
    print(f'\nActive StoryCollaborators: {active_collaborators.count()}')
    for c in active_collaborators:
        print(f'  - {c.user.username} ({c.role})')
        
except Comic.DoesNotExist:
    print(f'Story {story_id} not found')

