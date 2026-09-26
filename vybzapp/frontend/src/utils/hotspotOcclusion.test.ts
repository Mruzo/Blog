import {
  applyHotspotOcclusion,
  cameraWorldFromOrbit,
  distanceSquared,
} from './hotspotOcclusion';

describe('hotspotOcclusion', () => {
  it('places the camera from spherical orbit', () => {
    const camera = cameraWorldFromOrbit(
      { theta: 0, phi: Math.PI / 2, radius: 3 },
      { x: 0, y: 1.6, z: 0 }
    );
    expect(camera.x).toBeCloseTo(0);
    expect(camera.y).toBeCloseTo(1.6);
    expect(camera.z).toBeCloseTo(3);
  });

  it('hides a label when a distant wall is closer than the head', () => {
    const el = document.createElement('div');
    el.className = 'character-hotspot';
    el.setAttribute('slot', 'hotspot-Ava');

    const modelViewer = {
      querySelector: () => el,
      getCameraOrbit: () => ({ theta: 0, phi: Math.PI / 2, radius: 3 }),
      getCameraTarget: () => ({ x: 0, y: 1.6, z: 0 }),
      queryHotspot: () => ({ canvasPosition: { x: 10, y: 12 }, facingCamera: false }),
      positionAndNormalFromPoint: () => ({ position: { x: 0, y: 1.6, z: 2 } }),
    };

    applyHotspotOcclusion(modelViewer, [{ slot: 'hotspot-Ava', head: { x: 0, y: 1.6, z: 0 } }]);
    expect(el.classList.contains('is-occluded')).toBe(true);
  });

  it('keeps a label visible when the hit is the character mesh near the head', () => {
    const el = document.createElement('div');
    el.className = 'character-hotspot';

    const modelViewer = {
      querySelector: () => el,
      getCameraOrbit: () => ({ theta: 0, phi: Math.PI / 2, radius: 3 }),
      getCameraTarget: () => ({ x: 0, y: 1.6, z: 0 }),
      queryHotspot: () => ({ canvasPosition: { x: 10, y: 12 }, facingCamera: true }),
      positionAndNormalFromPoint: () => ({ position: { x: 0, y: 1.6, z: 0.4 } }),
    };

    applyHotspotOcclusion(modelViewer, [{ slot: 'hotspot-Ava', head: { x: 0, y: 1.6, z: 0 } }]);
    expect(el.classList.contains('is-occluded')).toBe(false);
  });

  it('keeps a facing-away label visible when nothing is closer', () => {
    const el = document.createElement('div');
    el.className = 'character-hotspot';

    const modelViewer = {
      querySelector: () => el,
      getCameraOrbit: () => ({ theta: 0, phi: Math.PI / 2, radius: 3 }),
      getCameraTarget: () => ({ x: 0, y: 1.6, z: 0 }),
      queryHotspot: () => ({ canvasPosition: { x: 10, y: 12 }, facingCamera: false }),
      positionAndNormalFromPoint: () => null,
    };

    applyHotspotOcclusion(modelViewer, [{ slot: 'hotspot-Ava', head: { x: 0, y: 1.6, z: 0 } }]);
    expect(el.classList.contains('is-occluded')).toBe(false);
    expect(distanceSquared({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(25);
  });
});
