export const CAMERA_TRANSITION_MOVE = 'move' as const;
export const CAMERA_TRANSITION_SNAP = 'snap' as const;

export type CameraTransition = typeof CAMERA_TRANSITION_MOVE | typeof CAMERA_TRANSITION_SNAP;

export function normalizeCameraTransition(value?: string | null): CameraTransition {
  return value === CAMERA_TRANSITION_SNAP ? CAMERA_TRANSITION_SNAP : CAMERA_TRANSITION_MOVE;
}

export function shouldSnapCamera(value?: string | null): boolean {
  return normalizeCameraTransition(value) === CAMERA_TRANSITION_SNAP;
}
