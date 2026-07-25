/** Shared 3D scene character slots for the platform model. */

export const MAX_CHARACTERS_PER_STORY = 4;

export const SCENE_SLOT_KEYS = ['North_SS', 'South_SS', 'East_SS', 'West_SS'] as const;

export type SceneSlotKey = (typeof SCENE_SLOT_KEYS)[number];

export interface SceneSlotPreset {
  key: SceneSlotKey;
  label: string;
  head_x: number;
  head_y: number;
  head_z: number;
}

export const SCENE_SLOT_PRESETS: SceneSlotPreset[] = [
  { key: 'North_SS', label: 'North_SS', head_x: -4.5, head_y: 2.0, head_z: 2.6 },
  { key: 'South_SS', label: 'South_SS', head_x: 4.5, head_y: 2.0, head_z: -2.6 },
  { key: 'East_SS', label: 'East_SS', head_x: -2.5, head_y: 2.0, head_z: -4.5 },
  { key: 'West_SS', label: 'West_SS', head_x: 2.03, head_y: 2.0, head_z: 4.5 },
];

export function coordsForSceneSlot(slot: string | null | undefined): {
  head_x: number;
  head_y: number;
  head_z: number;
} | null {
  const preset = SCENE_SLOT_PRESETS.find((item) => item.key === slot);
  if (!preset) {
    return null;
  }
  return {
    head_x: preset.head_x,
    head_y: preset.head_y,
    head_z: preset.head_z,
  };
}

export function matchSceneSlotFromCoords(
  headX?: number | null,
  headY?: number | null,
  headZ?: number | null,
  tolerance = 0.05
): SceneSlotKey | null {
  if (headX == null || headY == null || headZ == null) {
    return null;
  }
  const match = SCENE_SLOT_PRESETS.find(
    (preset) =>
      Math.abs(preset.head_x - headX) <= tolerance &&
      Math.abs(preset.head_y - headY) <= tolerance &&
      Math.abs(preset.head_z - headZ) <= tolerance
  );
  return match?.key ?? null;
}

export function isSceneSlotKey(value: string | null | undefined): value is SceneSlotKey {
  return SCENE_SLOT_KEYS.includes(value as SceneSlotKey);
}
