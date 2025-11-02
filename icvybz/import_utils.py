"""
Import utilities for seamless comic imports from other Django apps.

This module provides helper functions for importing comics and related data
from other Django applications that don't have the timestamp fields.
"""

from django.utils import timezone
from django.contrib.auth.models import User
from .models import Comic, Season, Episode, Character, Dialogue, POV


def import_comic_from_external_app(
    title,
    description,
    user_id,
    is_public=True,
    moderation_status='approved',
    comic_image=None,
    original_created_at=None,
    **extra_fields
):
    """
    Import a comic from an external Django app.
    
    Args:
        title (str): Comic title
        description (str): Comic description
        user_id (int): ID of the user who will own this comic
        is_public (bool): Whether the comic should be public
        moderation_status (str): Moderation status ('approved', 'pending', 'rejected')
        comic_image: Image file (optional)
        original_created_at (datetime): Original creation date from source app (optional)
        **extra_fields: Any additional fields to pass to Comic.objects.create()
    
    Returns:
        Comic: The created comic object
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError(f"User with ID {user_id} does not exist")
    
    # Prepare creation data
    comic_data = {
        'title': title,
        'description': description,
        'user': user,
        'is_public': is_public,
        'moderation_status': moderation_status,
        **extra_fields
    }
    
    # Add image if provided
    if comic_image:
        comic_data['comic_image'] = comic_image
    
    # Add original creation date if provided
    if original_created_at:
        comic_data['created_at'] = original_created_at
        comic_data['updated_at'] = timezone.now()
    
    # Create the comic
    comic = Comic.objects.create(**comic_data)
    
    return comic


def import_season_from_external_app(
    comic_id,
    title,
    season_number,
    description="",
    release_date=None,
    model_gltf=None,
    model_usdz=None,
    original_created_at=None,
    **extra_fields
):
    """
    Import a season from an external Django app.
    
    Args:
        comic_id (int): ID of the comic this season belongs to
        title (str): Season title
        season_number (int): Season number
        description (str): Season description
        release_date (date): Release date
        model_gltf: GLTF model file (optional)
        model_usdz: USDZ model file (optional)
        original_created_at (datetime): Original creation date from source app (optional)
        **extra_fields: Any additional fields to pass to Season.objects.create()
    
    Returns:
        Season: The created season object
    """
    try:
        comic = Comic.objects.get(id=comic_id)
    except Comic.DoesNotExist:
        raise ValueError(f"Comic with ID {comic_id} does not exist")
    
    # Prepare creation data
    season_data = {
        'comic': comic,
        'title': title,
        'season_number': season_number,
        'description': description,
        'release_date': release_date or timezone.now().date(),
        **extra_fields
    }
    
    # Add model files if provided
    if model_gltf:
        season_data['model_gltf'] = model_gltf
    if model_usdz:
        season_data['model_usdz'] = model_usdz
    
    # Add original creation date if provided
    if original_created_at:
        season_data['created_at'] = original_created_at
        season_data['updated_at'] = timezone.now()
    
    # Create the season
    season = Season.objects.create(**season_data)
    
    return season


def import_character_from_external_app(
    user_id,
    name,
    bio="",
    personality="",
    love_interest="",
    model_file=None,
    is_public=False,
    original_created_at=None,
    **extra_fields
):
    """
    Import a character from an external Django app.
    
    Args:
        user_id (int): ID of the user who will own this character
        name (str): Character name
        bio (str): Character bio
        personality (str): Character personality
        love_interest (str): Character love interest
        model_file: 3D model file (optional)
        is_public (bool): Whether the character should be public
        original_created_at (datetime): Original creation date from source app (optional)
        **extra_fields: Any additional fields to pass to Character.objects.create()
    
    Returns:
        Character: The created character object
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError(f"User with ID {user_id} does not exist")
    
    # Prepare creation data
    character_data = {
        'user': user,
        'name': name,
        'bio': bio,
        'personality': personality,
        'love_interest': love_interest,
        'is_public': is_public,
        **extra_fields
    }
    
    # Add model file if provided
    if model_file:
        character_data['model_file'] = model_file
    
    # Add original creation date if provided
    if original_created_at:
        character_data['created_at'] = original_created_at
        character_data['updated_at'] = timezone.now()
    
    # Create the character
    character = Character.objects.create(**character_data)
    
    return character


def bulk_import_comics_from_dict(comics_data, user_id):
    """
    Bulk import multiple comics from a list of dictionaries.
    
    Args:
        comics_data (list): List of dictionaries containing comic data
        user_id (int): ID of the user who will own these comics
    
    Returns:
        list: List of created Comic objects
    """
    created_comics = []
    
    for comic_data in comics_data:
        try:
            comic = import_comic_from_external_app(
                user_id=user_id,
                **comic_data
            )
            created_comics.append(comic)
        except Exception as e:
            print(f"Error importing comic '{comic_data.get('title', 'Unknown')}': {e}")
            continue
    
    return created_comics


# Example usage:
"""
# Example 1: Import a single comic
comic = import_comic_from_external_app(
    title="My Imported Story",
    description="A story imported from another app",
    user_id=1,
    is_public=True,
    original_created_at=datetime(2023, 1, 1)  # Optional: preserve original date
)

# Example 2: Import multiple comics
comics_data = [
    {
        'title': 'Story 1',
        'description': 'First imported story',
        'is_public': True
    },
    {
        'title': 'Story 2', 
        'description': 'Second imported story',
        'is_public': False
    }
]

created_comics = bulk_import_comics_from_dict(comics_data, user_id=1)

# Example 3: Import with custom timestamps
comic = import_comic_from_external_app(
    title="Preserved Date Story",
    description="Story with preserved creation date",
    user_id=1,
    original_created_at=datetime(2022, 12, 25)  # Christmas story!
)
"""
