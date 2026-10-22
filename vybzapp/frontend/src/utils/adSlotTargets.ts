export type AdSlotTarget = {
  materialName?: string;
  nodeName?: string;
  clickCenter?: { x: number; y: number; z: number };
  clickRadius?: number;
};

export const STATIC_AD_SLOT_TARGETS: Record<string, AdSlotTarget> = {
  ed_bb: {
    materialName: 'Billboard_front',
    clickCenter: { x: -6.556, y: 1.041, z: -7.314 },
    clickRadius: 4,
  },
};

export const DEFAULT_AD_SLOT = 'ed_bb';

const PANEL_NAME_RE = /(?:^|[\s._-])panel[\s._-]*(\d+)/i;

export function panelSlotFromName(name: string | undefined | null): string | null {
  if (!name) return null;
  const match = String(name).match(PANEL_NAME_RE);
  if (!match) return null;
  return `panel_${Number(match[1])}`;
}

function visitSceneNodes(root: any, visit: (node: any) => void) {
  if (!root) return;
  visit(root);
  const children = root.children || root.model?.children;
  if (Array.isArray(children)) {
    children.forEach((child) => visitSceneNodes(child, visit));
  }
}

function collectSceneRoots(modelViewer: any): any[] {
  const roots: any[] = [];
  const push = (value: any) => {
    if (!value || roots.includes(value)) return;
    roots.push(value);
  };

  push(modelViewer?.model?.scene);
  if (modelViewer?.model && typeof modelViewer.model.traverse === 'function') {
    push(modelViewer.model);
  }

  try {
    for (const symbol of Object.getOwnPropertySymbols(modelViewer || {})) {
      const value = modelViewer[symbol];
      if (!value) continue;
      if (typeof value.traverse === 'function') {
        push(value);
      }
      if (value.model && typeof value.model.traverse === 'function') {
        push(value.model);
      }
      if (value.target && typeof value.target.traverse === 'function') {
        push(value.target);
      }
    }
  } catch {
    // Ignore symbol inspection failures in tests or older browsers.
  }

  return roots;
}

export function getNodeWorldCenter(node: any): { x: number; y: number; z: number } | undefined {
  try {
    if (typeof node?.updateWorldMatrix === 'function') {
      node.updateWorldMatrix(true, false);
    }
    const elements = node?.matrixWorld?.elements;
    if (elements && elements.length >= 15) {
      return { x: elements[12], y: elements[13], z: elements[14] };
    }
    if (node?.position && typeof node.position.x === 'number') {
      return { x: node.position.x, y: node.position.y, z: node.position.z };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function discoverAdSlotTargets(
  modelViewer: any,
  staticTargets: Record<string, AdSlotTarget> = STATIC_AD_SLOT_TARGETS,
): Record<string, AdSlotTarget> {
  const slots: Record<string, AdSlotTarget> = {};
  Object.entries(staticTargets).forEach(([slotName, target]) => {
    slots[slotName] = { ...target };
  });

  const materials = modelViewer?.model?.materials || [];
  for (const material of materials) {
    const slotName = panelSlotFromName(material?.name);
    if (!slotName) continue;
    slots[slotName] = {
      ...slots[slotName],
      materialName: slots[slotName]?.materialName || material.name,
    };
  }

  for (const root of collectSceneRoots(modelViewer)) {
    const walk = typeof root.traverse === 'function'
      ? (visit: (node: any) => void) => root.traverse(visit)
      : (visit: (node: any) => void) => visitSceneNodes(root, visit);

    walk((node: any) => {
      const slotName = panelSlotFromName(node?.name);
      if (!slotName) return;
      const existing = slots[slotName] || {};
      const materialName = existing.materialName || node.material?.name;
      slots[slotName] = {
        ...existing,
        nodeName: existing.nodeName || node.name,
        materialName,
        clickCenter: existing.clickCenter || getMeshWorldCenter(node) || getNodeWorldCenter(node),
        clickRadius: existing.clickRadius || 1.5,
      };
    });
  }

  return slots;
}

export function resolveAdMaterial(modelViewer: any, target: AdSlotTarget) {
  const model = modelViewer?.model;
  if (!model) return null;
  if (target.materialName && typeof model.getMaterialByName === 'function') {
    const named = model.getMaterialByName(target.materialName);
    if (named) return named;
  }
  const materials = model.materials || [];
  if (target.materialName) {
    return materials.find((material: any) => material?.name === target.materialName) || null;
  }
  return null;
}

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

export function toViewerTextureUrl(
  imageUrl: string,
  pageOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  if (!imageUrl || !pageOrigin) return imageUrl;
  try {
    const url = new URL(imageUrl, pageOrigin);
    const page = new URL(pageOrigin);
    if (url.origin === page.origin) {
      return `${url.pathname}${url.search}`;
    }
    if (LOCAL_DEV_HOSTS.has(url.hostname) && LOCAL_DEV_HOSTS.has(page.hostname)) {
      return `${url.pathname}${url.search}`;
    }
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

export async function resolveViewerTextureUrl(imageUrl: string): Promise<string> {
  const sameOrigin = toViewerTextureUrl(imageUrl);
  const candidates = [sameOrigin];
  if (imageUrl && imageUrl !== sameOrigin) {
    candidates.push(imageUrl);
  }
  if (typeof fetch !== 'function') {
    return sameOrigin;
  }
  for (const candidate of candidates) {
    if (candidate.startsWith('data:') || candidate.startsWith('blob:')) {
      return candidate;
    }
    try {
      const response = await fetch(candidate, {
        credentials: candidate.startsWith('/') ? 'same-origin' : 'omit',
      });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.startsWith('image/')) {
        continue;
      }
      return URL.createObjectURL(await response.blob());
    } catch {
      // Try the next candidate. Local CRA may miss /media until the proxy is restarted.
    }
  }
  return imageUrl;
}

export function containDrawRect(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; width: number; height: number } {
  const safeImageWidth = imageWidth || 1;
  const safeImageHeight = imageHeight || 1;
  const safeFrameWidth = frameWidth || 1;
  const safeFrameHeight = frameHeight || 1;
  const imageAspect = safeImageWidth / safeImageHeight;
  const frameAspect = safeFrameWidth / safeFrameHeight;
  if (imageAspect > frameAspect) {
    const width = safeFrameWidth;
    const height = width / imageAspect;
    return { x: 0, y: (safeFrameHeight - height) / 2, width, height };
  }
  const height = safeFrameHeight;
  const width = height * imageAspect;
  return { x: (safeFrameWidth - width) / 2, y: 0, width, height };
}

/** Fill the panel width and vertically center. Tall creatives crop top/bottom. */
export function widthFitDrawRect(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; width: number; height: number } {
  const safeImageWidth = imageWidth || 1;
  const safeImageHeight = imageHeight || 1;
  const safeFrameWidth = frameWidth || 1;
  const safeFrameHeight = frameHeight || 1;
  const imageAspect = safeImageWidth / safeImageHeight;
  const width = safeFrameWidth;
  const height = width / imageAspect;
  return { x: 0, y: (safeFrameHeight - height) / 2, width, height };
}

export type PanelLocalBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

export type AdImageHitRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function getPanelLocalBounds(mesh: any): PanelLocalBounds | null {
  const position = mesh?.geometry?.getAttribute?.('position');
  if (!position || position.count < 3) {
    return null;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    minX = Math.min(minX, position.getX(index));
    maxX = Math.max(maxX, position.getX(index));
    minY = Math.min(minY, position.getY(index));
    maxY = Math.max(maxY, position.getY(index));
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (!(width > 0) || !(height > 0)) {
    return null;
  }
  return { minX, maxX, minY, maxY, width, height };
}

export function getPanelVisualAspect(mesh: any): number | null {
  const bounds = getPanelLocalBounds(mesh);
  if (!bounds) {
    return null;
  }

  const elements = mesh.matrixWorld?.elements;
  if (elements && elements.length >= 8) {
    const axisX = Math.hypot(elements[0], elements[1], elements[2]) * bounds.width;
    const axisY = Math.hypot(elements[4], elements[5], elements[6]) * bounds.height;
    if (axisX > 0 && axisY > 0) {
      return axisX / axisY;
    }
  }

  const scaleX = Math.abs(mesh.scale?.x ?? 1);
  const scaleY = Math.abs(mesh.scale?.y ?? 1);
  return (bounds.width * scaleX) / (bounds.height * scaleY);
}

export function getMeshWorldCenter(mesh: any): { x: number; y: number; z: number } | undefined {
  const bounds = getPanelLocalBounds(mesh);
  if (!bounds) {
    return getNodeWorldCenter(mesh);
  }
  const local = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: 0,
  };
  try {
    if (typeof mesh.updateMatrix === 'function') {
      mesh.updateMatrix();
    }
    if (typeof mesh.updateWorldMatrix === 'function') {
      mesh.updateWorldMatrix(true, false);
    }
    const elements = mesh.matrix?.elements || mesh.matrixWorld?.elements;
    if (elements && elements.length >= 16) {
      return {
        x: elements[0] * local.x + elements[4] * local.y + elements[8] * local.z + elements[12],
        y: elements[1] * local.x + elements[5] * local.y + elements[9] * local.z + elements[13],
        z: elements[2] * local.x + elements[6] * local.y + elements[10] * local.z + elements[14],
      };
    }
  } catch {
    return getNodeWorldCenter(mesh);
  }
  return getNodeWorldCenter(mesh);
}

export function getContainedImageLocalRect(
  bounds: PanelLocalBounds,
  imageAspect: number,
  panelAspect?: number | null,
): AdImageHitRect {
  const visualAspect = panelAspect && panelAspect > 0 ? panelAspect : bounds.width / bounds.height;
  const visualHeight = bounds.width / visualAspect;
  const draw = widthFitDrawRect(imageAspect, 1, bounds.width, visualHeight);
  const yScale = bounds.height / visualHeight;
  const minX = bounds.minX + draw.x;
  const maxX = bounds.minX + draw.x + draw.width;
  const minY = bounds.maxY - (draw.y + draw.height) * yScale;
  const maxY = bounds.maxY - draw.y * yScale;
  return {
    minX: Math.max(bounds.minX, Math.min(bounds.maxX, minX)),
    maxX: Math.max(bounds.minX, Math.min(bounds.maxX, maxX)),
    minY: Math.max(bounds.minY, Math.min(bounds.maxY, minY)),
    maxY: Math.max(bounds.minY, Math.min(bounds.maxY, maxY)),
  };
}

function invertAffinePoint(
  elements: number[],
  world: { x: number; y: number; z: number },
): { x: number; y: number; z: number } | null {
  const m00 = elements[0];
  const m01 = elements[4];
  const m02 = elements[8];
  const m10 = elements[1];
  const m11 = elements[5];
  const m12 = elements[9];
  const m20 = elements[2];
  const m21 = elements[6];
  const m22 = elements[10];
  const px = world.x - elements[12];
  const py = world.y - elements[13];
  const pz = world.z - elements[14];
  const det = m00 * (m11 * m22 - m12 * m21)
    - m01 * (m10 * m22 - m12 * m20)
    + m02 * (m10 * m21 - m11 * m20);
  if (!det) {
    return null;
  }
  const scale = 1 / det;
  const r00 = (m11 * m22 - m12 * m21) * scale;
  const r01 = (m02 * m21 - m01 * m22) * scale;
  const r02 = (m01 * m12 - m02 * m11) * scale;
  const r10 = (m12 * m20 - m10 * m22) * scale;
  const r11 = (m00 * m22 - m02 * m20) * scale;
  const r12 = (m02 * m10 - m00 * m12) * scale;
  const r20 = (m10 * m21 - m11 * m20) * scale;
  const r21 = (m01 * m20 - m00 * m21) * scale;
  const r22 = (m00 * m11 - m01 * m10) * scale;
  return {
    x: r00 * px + r01 * py + r02 * pz,
    y: r10 * px + r11 * py + r12 * pz,
    z: r20 * px + r21 * py + r22 * pz,
  };
}

export function worldToPanelLocal(
  mesh: any,
  world: { x: number; y: number; z: number },
): { x: number; y: number; z: number } | null {
  try {
    if (typeof mesh.updateMatrix === 'function') {
      mesh.updateMatrix();
    }
    if (typeof mesh.updateWorldMatrix === 'function') {
      mesh.updateWorldMatrix(true, false);
    }
    const localMatrix = mesh.matrix?.elements;
    if (localMatrix && localMatrix.length >= 16) {
      const local = invertAffinePoint(localMatrix, world);
      if (local) {
        return local;
      }
    }
    const inverse = mesh.matrixWorldInverse?.elements;
    if (inverse && inverse.length >= 16) {
      return {
        x: inverse[0] * world.x + inverse[4] * world.y + inverse[8] * world.z + inverse[12],
        y: inverse[1] * world.x + inverse[5] * world.y + inverse[9] * world.z + inverse[13],
        z: inverse[2] * world.x + inverse[6] * world.y + inverse[10] * world.z + inverse[14],
      };
    }
    const elements = mesh.matrixWorld?.elements;
    if (!elements || elements.length < 16) {
      return null;
    }
    return invertAffinePoint(elements, world);
  } catch {
    return null;
  }
}

export function isPointOnAdImage(
  local: { x: number; y: number; z: number },
  rect: AdImageHitRect,
  planeTolerance = 0.35,
): boolean {
  if (Math.abs(local.z) > planeTolerance) {
    return false;
  }
  return local.x >= rect.minX && local.x <= rect.maxX && local.y >= rect.minY && local.y <= rect.maxY;
}

export function slotFromSurface(surface: string | null | undefined): string | null {
  return panelSlotFromName(surface);
}

function factorToCss(factor: unknown): string | undefined {
  if (!Array.isArray(factor) || factor.length < 3) {
    return undefined;
  }
  const channel = (value: unknown) => Math.round(Math.min(1, Math.max(0, Number(value) || 0)) * 255);
  return `rgb(${channel(factor[0])}, ${channel(factor[1])}, ${channel(factor[2])})`;
}

async function fetchImageBlob(url: string): Promise<Blob | null> {
  if (typeof fetch !== 'function' || url.startsWith('data:')) {
    return null;
  }
  const response = await fetch(url, {
    credentials: url.startsWith('/') || url.startsWith('blob:') ? 'same-origin' : 'omit',
  });
  if (!response.ok) {
    return null;
  }
  const blob = await response.blob();
  return blob.type.startsWith('image/') ? blob : null;
}

export type LetterboxResult = {
  url: string;
  imageAspect: number | null;
};

export async function letterboxImageForPanel(
  imageUrl: string,
  panelAspect: number,
  fillColor = 'rgb(0, 0, 0)',
): Promise<LetterboxResult> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return { url: imageUrl, imageAspect: null };
  }
  const blob = await fetchImageBlob(imageUrl);
  if (!blob) {
    return { url: imageUrl, imageAspect: null };
  }
  const bitmap = await createImageBitmap(blob);
  const imageWidth = bitmap.width;
  const imageHeight = bitmap.height;
  if (!(imageWidth > 0) || !(imageHeight > 0)) {
    bitmap.close();
    return { url: imageUrl, imageAspect: null };
  }
  const imageAspect = imageWidth / imageHeight;
  if (!(panelAspect > 0)) {
    bitmap.close();
    return { url: imageUrl, imageAspect };
  }
  const maxEdge = 2048;
  let frameWidth = maxEdge;
  let frameHeight = Math.max(1, Math.round(frameWidth / panelAspect));
  if (frameHeight > maxEdge) {
    frameHeight = maxEdge;
    frameWidth = Math.max(1, Math.round(frameHeight * panelAspect));
  }
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return { url: imageUrl, imageAspect };
  }
  context.fillStyle = fillColor;
  context.fillRect(0, 0, frameWidth, frameHeight);
  const rect = widthFitDrawRect(imageWidth, imageHeight, frameWidth, frameHeight);
  context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
  bitmap.close();
  const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!output) {
    return { url: imageUrl, imageAspect };
  }
  return { url: URL.createObjectURL(output), imageAspect };
}

export type ApplyAdImageOptions = {
  panelAspect?: number | null;
  letterboxColor?: string;
};

export async function applyAdImageToMaterial(
  modelViewer: any,
  material: any,
  imageUrl: string,
  options?: ApplyAdImageOptions,
): Promise<{ imageAspect: number | null }> {
  if (!material || !imageUrl || typeof modelViewer?.createTexture !== 'function') {
    throw new Error('Ad texture apply is missing a material or createTexture');
  }
  if (typeof material.ensureLoaded === 'function') {
    await material.ensureLoaded();
  }
  const pbr = material.pbrMetallicRoughness;
  if (!pbr) {
    throw new Error('Material has no pbrMetallicRoughness');
  }
  const resolved = await resolveViewerTextureUrl(imageUrl);
  let textureSource = resolved;
  let imageAspect: number | null = null;
  try {
    const letterboxed = await letterboxImageForPanel(
      resolved,
      options?.panelAspect && options.panelAspect > 0 ? options.panelAspect : 0,
      options?.letterboxColor || factorToCss(pbr.baseColorFactor) || 'rgb(0, 0, 0)',
    );
    textureSource = letterboxed.url;
    imageAspect = letterboxed.imageAspect;
  } catch {
    // Keep the raw image if letterboxing is unavailable.
  }
  const texture = await modelViewer.createTexture(textureSource);
  if (typeof pbr.setBaseColorFactor === 'function') {
    pbr.setBaseColorFactor([1, 1, 1, 1]);
  }
  const textureInfo = pbr.baseColorTexture;
  if (textureInfo && typeof textureInfo.setTexture === 'function') {
    textureInfo.setTexture(texture);
    return { imageAspect };
  }
  if (typeof pbr.setBaseColorTexture === 'function') {
    pbr.setBaseColorTexture(texture);
    return { imageAspect };
  }
  throw new Error('Material cannot accept a base color texture');
}

function sceneHasPanelMesh(scene: any): boolean {
  let found = false;
  try {
    scene.traverse((node: any) => {
      if (found || !node?.geometry) return;
      if (panelSlotFromName(node.name)) {
        found = true;
      }
    });
  } catch {
    return false;
  }
  return found;
}

function collectTraversableScenes(modelViewer: any): any[] {
  const candidates: any[] = [];
  const consider = (value: any) => {
    if (!value || typeof value.traverse !== 'function' || candidates.includes(value)) {
      return;
    }
    candidates.push(value);
    if (value.target && typeof value.target.traverse === 'function' && !candidates.includes(value.target)) {
      candidates.push(value.target);
    }
  };
  consider(modelViewer?.model);
  consider(modelViewer?.model?.scene);
  try {
    for (const symbol of Object.getOwnPropertySymbols(modelViewer || {})) {
      consider(modelViewer[symbol]);
    }
  } catch {
    // Private scene access differs slightly across browsers.
  }
  return candidates;
}

export function getModelViewerScene(modelViewer: any): any | null {
  const candidates = collectTraversableScenes(modelViewer);
  return candidates.find((scene) => sceneHasPanelMesh(scene)) || candidates[0] || null;
}

function worldTranslationLength(mesh: any): number {
  try {
    if (typeof mesh.updateWorldMatrix === 'function') {
      mesh.updateWorldMatrix(true, false);
    }
  } catch {
    // Keep going with the last matrix.
  }
  const elements = mesh?.matrixWorld?.elements;
  if (!elements || elements.length < 15) {
    return 0;
  }
  return Math.hypot(elements[12], elements[13], elements[14]);
}

export function findAllPanelMeshes(modelViewer: any, slotName: string): any[] {
  const meshes: any[] = [];
  for (const scene of collectTraversableScenes(modelViewer)) {
    try {
      scene.traverse((node: any) => {
        if (panelSlotFromName(node?.name) !== slotName) return;
        if (node.geometry?.getAttribute?.('uv') && node.geometry.getAttribute('position')) {
          if (!meshes.includes(node)) {
            meshes.push(node);
          }
        }
      });
    } catch {
      // Skip scenes that cannot be traversed.
    }
  }
  return meshes;
}

export function pickPanelMeshForHit(
  meshes: any[],
  worldPoint: { x: number; y: number; z: number },
): any | null {
  let best: any = null;
  let bestDist = Infinity;
  for (const mesh of meshes) {
    const local = worldToPanelLocal(mesh, worldPoint);
    const bounds = getPanelLocalBounds(mesh);
    if (!local || !bounds) {
      continue;
    }
    const dx = local.x < bounds.minX ? bounds.minX - local.x : local.x > bounds.maxX ? local.x - bounds.maxX : 0;
    const dy = local.y < bounds.minY ? bounds.minY - local.y : local.y > bounds.maxY ? local.y - bounds.maxY : 0;
    const dist = Math.hypot(dx, dy, local.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = mesh;
    }
  }
  return best;
}

export function findPanelMesh(
  modelViewer: any,
  slotName: string,
  worldHint?: { x: number; y: number; z: number },
): any | null {
  const meshes = findAllPanelMeshes(modelViewer, slotName);
  if (worldHint) {
    return pickPanelMeshForHit(meshes, worldHint) || meshes[0] || null;
  }
  return [...meshes].sort((left, right) => worldTranslationLength(right) - worldTranslationLength(left))[0] || null;
}

export function applyFullBleedPanelUVs(mesh: any): boolean {
  const geometry = mesh?.geometry;
  const position = geometry?.getAttribute?.('position');
  const uv = geometry?.getAttribute?.('uv');
  if (!position || !uv || position.count < 3) {
    return false;
  }
  if (!mesh.userData) {
    mesh.userData = {};
  }
  if (!mesh.userData.__adOriginalUV) {
    mesh.userData.__adOriginalUV = Array.from(uv.array);
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(
      index,
      (position.getX(index) - minX) / width,
      1 - (position.getY(index) - minY) / height,
    );
  }
  uv.needsUpdate = true;
  return true;
}

export function restorePanelUVs(mesh: any): boolean {
  const uv = mesh?.geometry?.getAttribute?.('uv');
  const original = mesh?.userData?.__adOriginalUV;
  if (!uv || !original) {
    return false;
  }
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, original[index * 2], original[index * 2 + 1]);
  }
  uv.needsUpdate = true;
  return true;
}
