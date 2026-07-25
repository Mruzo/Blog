"""Shared 3D scene character slots for the platform model."""

SCENE_SLOT_NORTH = 'North_SS'
SCENE_SLOT_SOUTH = 'South_SS'
SCENE_SLOT_EAST = 'East_SS'
SCENE_SLOT_WEST = 'West_SS'

SCENE_SLOT_CHOICES = [
    (SCENE_SLOT_NORTH, 'North_SS'),
    (SCENE_SLOT_SOUTH, 'South_SS'),
    (SCENE_SLOT_EAST, 'East_SS'),
    (SCENE_SLOT_WEST, 'West_SS'),
]

SCENE_SLOT_PRESETS = {
    SCENE_SLOT_NORTH: {'head_x': -4.5, 'head_y': 2.0, 'head_z': 2.6},
    SCENE_SLOT_SOUTH: {'head_x': 4.5, 'head_y': 2.0, 'head_z': -2.6},
    SCENE_SLOT_EAST: {'head_x': -2.5, 'head_y': 2.0, 'head_z': -4.5},
    SCENE_SLOT_WEST: {'head_x': 2.03, 'head_y': 2.0, 'head_z': 4.5},
}

MAX_CHARACTERS_PER_STORY = 4
SCENE_SLOT_KEYS = tuple(SCENE_SLOT_PRESETS.keys())


def camera_target_for_coords(head_x, head_y, head_z):
    return f'{head_x}m {head_y}m {head_z}m'


def coords_for_slot(slot):
    preset = SCENE_SLOT_PRESETS.get(slot)
    if not preset:
        return None
    return {
        **preset,
        'default_camera_target': camera_target_for_coords(
            preset['head_x'], preset['head_y'], preset['head_z']
        ),
    }


def match_slot_from_coords(head_x, head_y, head_z, tolerance=0.05):
    """Return a preset key if coordinates match a known slot, else None."""
    try:
        x = float(head_x)
        y = float(head_y)
        z = float(head_z)
    except (TypeError, ValueError):
        return None

    for slot, preset in SCENE_SLOT_PRESETS.items():
        if (
            abs(preset['head_x'] - x) <= tolerance
            and abs(preset['head_y'] - y) <= tolerance
            and abs(preset['head_z'] - z) <= tolerance
        ):
            return slot
    return None


def apply_scene_slot_to_character(character, slot):
    """Create or update the character POV from a scene-slot preset. Returns POV or None."""
    from .models import POV

    coords = coords_for_slot(slot)
    if not coords:
        return None

    pov, created = POV.objects.get_or_create(
        character=character,
        defaults={
            'title': f"{character.name}'s POV",
            'head_x': coords['head_x'],
            'head_y': coords['head_y'],
            'head_z': coords['head_z'],
            'default_camera_target': coords['default_camera_target'],
        },
    )
    if not created:
        pov.head_x = coords['head_x']
        pov.head_y = coords['head_y']
        pov.head_z = coords['head_z']
        pov.default_camera_target = coords['default_camera_target']
        pov.save(update_fields=['head_x', 'head_y', 'head_z', 'default_camera_target'])
    return pov
