import { describe, expect, it } from 'vitest';
import { assetRef, fitWithin, packProjectFile, resolveAssets, unpackProjectAssets, usedAssetIds } from '../src/assets/assets';
import type { Asset } from '../src/assets/assets';
import { applyCommand } from '../src/model/commands';
import { createSequentialIds } from '../src/model/ids';
import { ProjectStore, memoryStore } from '../src/storage/projectStore';
import { renderPage } from '../src/render/html';
import { sampleProject } from './helpers';

// A 1x1 transparent PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const ids = createSequentialIds(9950);

function asset(id: string, projectId: string): Asset {
  return { id, projectId, name: `${id}.png`, type: 'image/png', dataUrl: PNG, width: 1, height: 1, bytes: 68, createdAt: '2026-11-08T10:00:00.000Z' };
}

function withHeroImage(ref: string) {
  const p = sampleProject('', 0);
  const hero = p.pages[0].sections.find((s) => s.type === 'about')!;
  const r = applyCommand(p, { kind: 'updateContent', pageId: p.pages[0].id, sectionId: hero.id, patch: { imageUrl: ref } }, ids);
  if (!r.ok) throw new Error(r.error);
  return r.project;
}

describe('image assets', () => {
  it('stores only a short reference in the project and validates it', () => {
    const p = withHeroImage(assetRef('asset_abc1'));
    expect(p.pages[0].sections.find((s) => s.type === 'about')!.content.imageUrl).toBe('asset:asset_abc1');
  });

  it('resolves references to embedded images for the canvas and the export', () => {
    const p = withHeroImage(assetRef('asset_abc1'));
    const html = renderPage(resolveAssets(p, new Map([['asset_abc1', PNG]])), { mode: 'export', runtimeJs: '' });
    expect(html).toContain(`<img src="${PNG}"`);
  });

  it('shows the normal placeholder when an image was deleted', () => {
    const p = withHeroImage(assetRef('asset_gone'));
    const html = renderPage(resolveAssets(p, new Map()), { mode: 'export', runtimeJs: '' });
    expect(html).not.toContain('asset:');
    expect(html).toContain('aria-label="Image placeholder"');
  });

  it('never upscales and keeps the aspect ratio when resizing', () => {
    expect(fitWithin(4000, 2000)).toEqual({ width: 1920, height: 960 });
    expect(fitWithin(1000, 3000)).toEqual({ width: 640, height: 1920 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('saves only the images a project uses, and the file still opens as a project', () => {
    const p = withHeroImage(assetRef('asset_used'));
    expect([...usedAssetIds(p)]).toEqual(['asset_used']);
    const text = packProjectFile(p, [asset('asset_used', p.id), asset('asset_unused', p.id)]);
    expect(JSON.parse(text).__assets.map((a: Asset) => a.id)).toEqual(['asset_used']);
    expect(new ProjectStore(memoryStore()).parse(text).id).toBe(p.id);
  });

  it('restores images from a saved file, binds them to the project and drops unsafe entries', () => {
    const p = withHeroImage(assetRef('asset_used'));
    const evil = { ...asset('asset_evil', 'proj_other'), dataUrl: 'javascript:alert(1)' };
    const text = JSON.stringify({ ...p, __assets: [asset('asset_used', 'proj_somewhereelse'), evil, 'garbage'] });
    const restored = unpackProjectAssets(text, p.id);
    expect(restored.map((a) => a.id)).toEqual(['asset_used']);
    expect(restored[0].projectId).toBe(p.id);
    expect(unpackProjectAssets('not json', p.id)).toEqual([]);
  });
});
