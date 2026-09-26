export type Vec3 = { x: number; y: number; z: number };

export type HotspotOcclusionTarget = {
  slot: string;
  head: Vec3;
};

export const HOTSPOT_OCCLUSION_EPSILON_M = 0.35;
/** Hits this close to the label are the character's own mesh, not a wall. */
export const HOTSPOT_SELF_HIT_RADIUS_M = 1.5;

export function cameraWorldFromOrbit(
  orbit: { theta: number; phi: number; radius: number },
  target: Vec3
): Vec3 {
  return {
    x: target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    y: target.y + orbit.radius * Math.cos(orbit.phi),
    z: target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
  };
}

export function distanceSquared(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

type ModelViewerHotspotHost = {
  queryHotspot?: (
    slot: string
  ) => { canvasPosition?: { x: number; y: number }; facingCamera?: boolean } | null;
  positionAndNormalFromPoint?: (x: number, y: number) => { position?: Vec3 } | null;
  getCameraOrbit?: () => { theta: number; phi: number; radius: number } | null;
  getCameraTarget?: () => Vec3 | null;
  querySelector: (selector: string) => Element | null;
};

/** Hide a label only when a surface well in front of the character blocks it. */
export function applyHotspotOcclusion(
  modelViewer: ModelViewerHotspotHost,
  hotspots: HotspotOcclusionTarget[]
): void {
  if (!modelViewer.queryHotspot || !modelViewer.positionAndNormalFromPoint) {
    return;
  }

  const orbit = modelViewer.getCameraOrbit?.();
  const target = modelViewer.getCameraTarget?.();
  if (!orbit || !target) {
    return;
  }

  const camera = cameraWorldFromOrbit(orbit, target);

  hotspots.forEach((hotspot) => {
    const el = modelViewer.querySelector(
      `.character-hotspot[slot="${hotspot.slot}"]`
    ) as HTMLElement | null;
    if (!el) {
      return;
    }

    const hotspotData = modelViewer.queryHotspot?.(hotspot.slot);
    if (!hotspotData?.canvasPosition) {
      el.classList.remove('is-occluded');
      return;
    }

    const { x, y } = hotspotData.canvasPosition;
    const hit = modelViewer.positionAndNormalFromPoint?.(x, y);
    if (!hit?.position) {
      el.classList.remove('is-occluded');
      return;
    }

    const hitNearLabel =
      distanceSquared(hit.position, hotspot.head) <=
      HOTSPOT_SELF_HIT_RADIUS_M * HOTSPOT_SELF_HIT_RADIUS_M;
    if (hitNearLabel) {
      el.classList.remove('is-occluded');
      return;
    }

    const distHit = Math.sqrt(distanceSquared(camera, hit.position));
    const distLabel = Math.sqrt(distanceSquared(camera, hotspot.head));
    el.classList.toggle(
      'is-occluded',
      distHit + HOTSPOT_OCCLUSION_EPSILON_M < distLabel
    );
  });
}
