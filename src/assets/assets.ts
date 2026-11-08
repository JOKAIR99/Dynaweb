import { z } from 'zod';
import type { Project } from '../model/schema';

/**
 * Uploaded images ("assets"). They live in the browser's IndexedDB, never on a
 * server. The site model refers to one as `asset:<id>` in any image field;
 * resolveAssets() swaps those references for embedded data URLs right before
 * rendering, so the canvas and the exported HTML show the real image and the
 * exported file stays standalone.
 */
export const ASSET_PREFIX = 'asset:';
/** 2560 px keeps photos sharp on Retina and 4K screens. */
export const MAX_SIDE = 2560;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
export const MAX_STORED_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const assetSchema = z.object({
  id: z.string().regex(/^asset_[a-z0-9]+$/),
  projectId: z.string().regex(/^[a-z]+_[a-z0-9]+$/),
  name: z.string().max(200),
  type: z.enum(ACCEPTED_TYPES),
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/).max(MAX_STORED_BYTES * 1.4),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  createdAt: z.string(),
});
export type Asset = z.infer<typeof assetSchema>;

export const isAssetRef = (url: string) => url.startsWith(ASSET_PREFIX);
export const assetRef = (id: string) => `${ASSET_PREFIX}${id}`;

/** Largest size within maxSide that keeps the aspect ratio; never upscales. */
export function fitWithin(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Returns a copy of the project where every `asset:<id>` image field is replaced
 * by the asset's data URL. Unknown ids become an empty string, so the renderer
 * shows its normal image placeholder instead of a broken image.
 */
export function resolveAssets(project: Project, assets: ReadonlyMap<string, string>): Project {
  const fix = (url: string) => (isAssetRef(url) ? assets.get(url.slice(ASSET_PREFIX.length)) ?? '' : url);
  return {
    ...project,
    pages: project.pages.map((page) => ({
      ...page,
      sections: page.sections.map((s) => ({
        ...s,
        content: { ...s.content, imageUrl: fix(s.content.imageUrl), items: s.content.items.map((i) => ({ ...i, imageUrl: fix(i.imageUrl) })) },
        animations: s.animations.map((a) => (a.type === 'parallax'
          ? { ...a, settings: { ...a.settings, layers: a.settings.layers.map((l) => ({ ...l, imageUrl: fix(l.imageUrl) })) } }
          : a)),
      })),
    })),
  };
}

/** Asset ids a project actually uses, so a saved file only carries what it needs. */
export function usedAssetIds(project: Project): Set<string> {
  const ids = new Set<string>();
  const add = (url: string) => { if (isAssetRef(url)) ids.add(url.slice(ASSET_PREFIX.length)); };
  for (const page of project.pages) for (const s of page.sections) {
    add(s.content.imageUrl);
    s.content.items.forEach((i) => add(i.imageUrl));
    s.animations.forEach((a) => { if (a.type === 'parallax') a.settings.layers.forEach((l) => add(l.imageUrl)); });
  }
  return ids;
}

/** A saved project file: the project plus the images it uses (an extra key the project schema ignores). */
export function packProjectFile(project: Project, assets: Asset[]): string {
  const used = usedAssetIds(project);
  return JSON.stringify({ ...project, __assets: assets.filter((a) => used.has(a.id)) }, null, 2);
}

/** Reads the images out of a saved file; invalid entries are dropped, never trusted. */
export function unpackProjectAssets(text: string, projectId: string): Asset[] {
  try {
    const raw = JSON.parse(text) as { __assets?: unknown };
    if (!Array.isArray(raw.__assets)) return [];
    return raw.__assets
      .map((a) => assetSchema.safeParse({ ...(a as object), projectId }))
      .filter((r) => r.success)
      .map((r) => r.data as Asset);
  } catch {
    return [];
  }
}

// ---------- Browser-only parts ----------

/** Resizes and re-encodes an image file. GIFs are kept as-is (to keep animation) when small enough. */
export async function processImage(file: File, ids: (prefix: string) => string, projectId: string): Promise<Asset> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) throw new Error('Use a JPEG, PNG, WebP or GIF image.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('This image is larger than 15 MB.');
  const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(blob);
  });
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('The image could not be decoded.'); });
  const base = { id: ids('asset'), projectId, name: file.name.slice(0, 200), createdAt: new Date().toISOString() };
  if (file.type === 'image/gif' && file.size <= MAX_STORED_BYTES) {
    const dataUrl = await readAsDataUrl(file);
    return { ...base, type: 'image/gif', dataUrl, width: bitmap.width, height: bitmap.height, bytes: file.size };
  }
  const size = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  for (const quality of [0.9, 0.82, 0.7, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.size <= MAX_STORED_BYTES) {
      return { ...base, type: 'image/webp', dataUrl: await readAsDataUrl(blob), width: size.width, height: size.height, bytes: blob.size };
    }
  }
  throw new Error('This image is still too large after compression.');
}

const DB_NAME = 'dynaweb-assets';
const STORE = 'assets';

/** IndexedDB access for assets, per project. */
export class AssetStore {
  private db: Promise<IDBDatabase>;

  constructor() {
    this.db = new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        const store = open.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(new Error('Image storage is not available in this browser.'));
    });
  }

  private async run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const request = fn(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Image storage failed. The browser may be out of space.'));
    });
  }

  list(projectId: string): Promise<Asset[]> {
    return this.run('readonly', (s) => s.index('projectId').getAll(projectId)) as Promise<Asset[]>;
  }

  put(asset: Asset): Promise<IDBValidKey> {
    return this.run('readwrite', (s) => s.put(asset));
  }

  remove(id: string): Promise<undefined> {
    return this.run('readwrite', (s) => s.delete(id));
  }
}
