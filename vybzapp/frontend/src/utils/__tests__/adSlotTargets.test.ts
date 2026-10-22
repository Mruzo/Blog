import { applyAdImageToMaterial, applyFullBleedPanelUVs, containDrawRect, discoverAdSlotTargets, getContainedImageLocalRect, getPanelVisualAspect, isPointOnAdImage, panelSlotFromName, pickPanelMeshForHit, slotFromSurface, toViewerTextureUrl, widthFitDrawRect } from '../adSlotTargets';

describe('panelSlotFromName', () => {
  it('maps GLB panel node names to slot ids', () => {
    expect(panelSlotFromName('panel 1')).toBe('panel_1');
    expect(panelSlotFromName('panel 12')).toBe('panel_12');
    expect(panelSlotFromName('panel_3')).toBe('panel_3');
    expect(panelSlotFromName('panel 1.001')).toBe('panel_1');
    expect(panelSlotFromName('panel_3_mat')).toBe('panel_3');
    expect(panelSlotFromName('Billboard_front')).toBeNull();
  });
});

describe('discoverAdSlotTargets', () => {
  it('keeps the v3.2 billboard slot and discovers panel nodes without materials', () => {
    const modelViewer = {
      model: {
        materials: [],
        scene: {
          children: [
            {
              name: 'panel 1',
              matrixWorld: { elements: new Array(16).fill(0).map((_, index) => (index === 12 ? 2 : index === 13 ? 3 : index === 14 ? 4 : 0)) },
              children: [],
            },
            {
              name: 'panel 2.001',
              material: { name: 'panel 2' },
              children: [],
            },
          ],
        },
      },
    };

    const slots = discoverAdSlotTargets(modelViewer);
    expect(slots.ed_bb?.materialName).toBe('Billboard_front');
    expect(slots.panel_1?.nodeName).toBe('panel 1');
    expect(slots.panel_1?.clickCenter).toEqual({ x: 2, y: 3, z: 4 });
    expect(slots.panel_2?.materialName).toBe('panel 2');
  });

  it('maps panel_3_mat onto the panel_3 slot', () => {
    const slots = discoverAdSlotTargets({
      model: {
        materials: [{ name: 'panel_3_mat' }],
        scene: { children: [{ name: 'panel_3', children: [] }] },
      },
    });
    expect(slots.panel_3?.materialName).toBe('panel_3_mat');
    expect(slots.panel_3?.nodeName).toBe('panel_3');
  });
});

describe('toViewerTextureUrl', () => {
  it('rewrites the Django media host to a same-origin path for local Firefox', () => {
    expect(
      toViewerTextureUrl('http://127.0.0.1:8000/media/ads/creatives/Asset_10.png', 'http://localhost:3000')
    ).toBe('/media/ads/creatives/Asset_10.png');
    expect(
      toViewerTextureUrl('http://localhost:3000/media/ads/creatives/Asset_10.png', 'http://localhost:3000')
    ).toBe('/media/ads/creatives/Asset_10.png');
    expect(
      toViewerTextureUrl('https://cdn.example.com/media/ads/creatives/Asset_10.png', 'http://localhost:3000')
    ).toBe('https://cdn.example.com/media/ads/creatives/Asset_10.png');
  });
});

describe('applyAdImageToMaterial', () => {
  it('paints a color-only material by assigning a base color texture', async () => {
    const setTexture = jest.fn();
    const setBaseColorFactor = jest.fn();
    const createTexture = jest.fn().mockResolvedValue({ id: 'tex' });
    const createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/ad');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name: string) => (name === 'content-type' ? 'image/png' : null) },
      blob: async () => new Blob(['ad'], { type: 'image/png' }),
    });
    const originalFetch = global.fetch;
    const originalCreateObjectURL = URL.createObjectURL;
    global.fetch = fetchMock as unknown as typeof fetch;
    URL.createObjectURL = createObjectURL;

    try {
      await applyAdImageToMaterial(
        { createTexture },
        {
          pbrMetallicRoughness: {
            setBaseColorFactor,
            baseColorTexture: { setTexture },
          },
        },
        'http://127.0.0.1:8000/media/ads/creatives/Asset_10.png',
      );
      expect(fetchMock).toHaveBeenCalledWith('/media/ads/creatives/Asset_10.png', { credentials: 'same-origin' });
      expect(setBaseColorFactor).toHaveBeenCalledWith([1, 1, 1, 1]);
      expect(createTexture).toHaveBeenCalledWith('blob:http://localhost/ad');
      expect(setTexture).toHaveBeenCalledWith({ id: 'tex' });
    } finally {
      global.fetch = originalFetch;
      URL.createObjectURL = originalCreateObjectURL;
    }
  });
});

describe('containDrawRect', () => {
  it('letterboxes a wide image inside a taller frame', () => {
    expect(containDrawRect(200, 100, 200, 200)).toEqual({
      x: 0,
      y: 50,
      width: 200,
      height: 100,
    });
  });

  it('pillarboxes a tall image inside a wider frame', () => {
    expect(containDrawRect(100, 200, 200, 100)).toEqual({
      x: 75,
      y: 0,
      width: 50,
      height: 100,
    });
  });

  it('fits a square creative onto a 2:1 panel without stretching', () => {
    expect(containDrawRect(1080, 1080, 2048, 1024)).toEqual({
      x: 512,
      y: 0,
      width: 1024,
      height: 1024,
    });
  });
});

describe('widthFitDrawRect', () => {
  it('fills the frame width and centers a wide image vertically', () => {
    expect(widthFitDrawRect(200, 100, 200, 200)).toEqual({
      x: 0,
      y: 50,
      width: 200,
      height: 100,
    });
  });

  it('fills the frame width and crops a tall image top and bottom', () => {
    expect(widthFitDrawRect(100, 200, 200, 100)).toEqual({
      x: 0,
      y: -150,
      width: 200,
      height: 400,
    });
  });

  it('fills a 2:1 panel with a square creative and centers the crop', () => {
    expect(widthFitDrawRect(1080, 1080, 2048, 1024)).toEqual({
      x: 0,
      y: -512,
      width: 2048,
      height: 2048,
    });
  });
});

describe('ad image hit rects', () => {
  const bounds = { minX: -1.9, maxX: 1.9, minY: -0.95, maxY: 0.95, width: 3.8, height: 1.9 };

  it('fills a 2:1 panel with a square creative and crops the height', () => {
    const rect = getContainedImageLocalRect(bounds, 1);
    expect(rect.minX).toBeCloseTo(-1.9);
    expect(rect.maxX).toBeCloseTo(1.9);
    expect(rect.minY).toBeCloseTo(-0.95);
    expect(rect.maxY).toBeCloseTo(0.95);
    expect(isPointOnAdImage({ x: 0, y: 0, z: 0 }, rect)).toBe(true);
    expect(isPointOnAdImage({ x: -1.6, y: 0, z: 0 }, rect)).toBe(true);
  });

  it('keeps a wide creative letterboxed so top and bottom clicks miss', () => {
    const rect = getContainedImageLocalRect(bounds, 3);
    expect(isPointOnAdImage({ x: 0, y: 0, z: 0 }, rect)).toBe(true);
    expect(isPointOnAdImage({ x: 0, y: 0.9, z: 0 }, rect)).toBe(false);
    expect(isPointOnAdImage({ x: 0, y: -0.9, z: 0 }, rect)).toBe(false);
  });

  it('uses visual panel aspect when the mesh is scaled on Y', () => {
    const scaled = { minX: -1.9, maxX: 1.9, minY: -0.475, maxY: 0.475, width: 3.8, height: 0.95 };
    const rect = getContainedImageLocalRect(scaled, 3, 2);
    expect(isPointOnAdImage({ x: 0, y: 0, z: 0 }, rect)).toBe(true);
    expect(isPointOnAdImage({ x: 0, y: 0.42, z: 0 }, rect)).toBe(false);
  });

  it('picks the placed panel instance for a world hit', () => {
    const localMesh = {
      matrixWorld: { elements: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,9,0,1] },
      geometry: {
        getAttribute: (name: string) => name === 'position' ? {
          count: 4,
          getX: (index: number) => (index % 2 === 0 ? -1.9 : 1.9),
          getY: (index: number) => (index < 2 ? -0.5 : 0.5),
        } : null,
      },
    };
    const placedMesh = {
      matrixWorld: { elements: [1,0,0,0, 0,1,0,0, 0,0,1,0, -12.5,6.4,13.3,1] },
      geometry: localMesh.geometry,
    };
    expect(pickPanelMeshForHit([localMesh, placedMesh], { x: -12.5, y: 6.4, z: 13.3 })).toBe(placedMesh);
  });

  it('maps panel surface strings to slot ids', () => {
    expect(slotFromSurface('panel_9 0 0.25 0.25 0.5')).toBe('panel_9');
    expect(slotFromSurface('panel 11 2 0.1 0.2 0.7')).toBe('panel_11');
    expect(slotFromSurface('Billboard_front 0 1 0 0')).toBeNull();
  });
});

describe('getPanelVisualAspect', () => {
  it('uses mesh scale so a 2:1 panel stays 2:1 after Y scale', () => {
    const xs = [-1.9, 1.9, -1.9, 1.9];
    const ys = [-0.475, -0.475, 0.475, 0.475];
    const mesh = {
      scale: { x: 1, y: 2, z: 1 },
      geometry: {
        getAttribute: (name: string) => (
          name === 'position'
            ? {
                count: 4,
                getX: (index: number) => xs[index],
                getY: (index: number) => ys[index],
              }
            : null
        ),
      },
    };

    expect(getPanelVisualAspect(mesh)).toBeCloseTo(2);
  });
});

describe('applyFullBleedPanelUVs', () => {
  it('remaps atlas UVs so the ad covers the panel upright', () => {
    const xs = [-1.9, 1.9, -1.9, 1.9];
    const ys = [-0.475, -0.475, 0.475, 0.475];
    const uv = [0.375, 0, 0.375, 0.25, 0.625, 0, 0.625, 0.25];
    const mesh = {
      userData: {},
      geometry: {
        getAttribute: (name: string) => {
          if (name === 'position') {
            return {
              count: 4,
              getX: (index: number) => xs[index],
              getY: (index: number) => ys[index],
            };
          }
          if (name === 'uv') {
            return {
              count: 4,
              array: uv,
              setXY: (index: number, u: number, v: number) => {
                uv[index * 2] = u;
                uv[index * 2 + 1] = v;
              },
            };
          }
          return null;
        },
      },
    };

    expect(applyFullBleedPanelUVs(mesh)).toBe(true);
    expect(uv).toEqual([0, 1, 1, 1, 0, 0, 1, 0]);
  });
});
