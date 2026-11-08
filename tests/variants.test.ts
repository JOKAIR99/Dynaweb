import { describe, expect, it } from 'vitest';
import { generateProject, PRESET_LAYOUTS } from '../src/generator/generate';
import { PRESETS } from '../src/generator/presets';
import { applyCommand } from '../src/model/commands';
import { createSequentialIds } from '../src/model/ids';
import { SECTION_VARIANTS } from '../src/model/schema';
import { renderPage } from '../src/render/html';
import { ProjectStore, memoryStore } from '../src/storage/projectStore';
import { NOW, sampleMeta, sampleProject } from './helpers';

const ids = createSequentialIds(8000);
const render = (p = sampleProject()) => renderPage(p, { mode: 'export', runtimeJs: '' });
const sectionOf = (p: ReturnType<typeof sampleProject>, type: string) => p.pages[0].sections.find((s) => s.type === type)!;
const withVariant = (type: string, variant: string, brief = '') => {
  const p = sampleProject(brief, 2);
  const r = applyCommand(p, { kind: 'updateStyle', pageId: p.pages[0].id, sectionId: sectionOf(p, type).id, patch: { variant } }, ids);
  if (!r.ok) throw new Error(r.error);
  return r.project;
};

describe('layout variants', () => {
  it('only accepts variants allowed for the section type', () => {
    const p = sampleProject();
    const hero = sectionOf(p, 'hero');
    const bad = applyCommand(p, { kind: 'updateStyle', pageId: p.pages[0].id, sectionId: hero.id, patch: { variant: 'masonry' } }, ids);
    expect(bad).toMatchObject({ ok: false });
    expect(bad.ok === false && bad.error).toContain('variant');
  });

  it('every preset layout uses variants valid for its section type', () => {
    for (const [preset, layout] of Object.entries(PRESET_LAYOUTS)) {
      for (const [type, variant] of Object.entries(layout)) {
        expect((SECTION_VARIANTS as Record<string, readonly string[]>)[type], `${preset}.${type}`).toContain(variant);
      }
    }
  });

  it('gives each preset a different page composition', () => {
    const signatures = PRESETS.map((t) => {
      const p = generateProject({ name: 'X', owner: 't', meta: sampleMeta({ brief: '' }), presetId: t.presetId, motionIntensity: 1 }, createSequentialIds(), NOW);
      return p.pages[0].sections.map((s) => s.style.variant).join(',');
    });
    expect(new Set(signatures).size).toBe(PRESETS.length);
  });

  it('adds a variant class to every section', () => {
    const html = render(withVariant('services', 'list'));
    expect(html).toMatch(/class="dw-section dw-services [^"]*dw-v-list/);
    expect(html).toMatch(/class="dw-section dw-about [^"]*dw-v-standard/); // Lagoon keeps About standard
  });

  it('renders the split hero with an image slot next to the text', () => {
    const html = render(withVariant('hero', 'split'));
    expect(html).toMatch(/<div class="dw-hero-text"><h1[^>]*>.*<\/div><div class="dw-media"/);
  });

  it('uses the parallax layer as the full-bleed image instead of adding a second one', () => {
    const withParallax = render(withVariant('hero', 'fullbleed', 'parallax'));
    expect(withParallax).not.toMatch(/<(img|div) class="dw-hero-bg/);
    const without = render(withVariant('hero', 'fullbleed', ''));
    // Natural atmosphere adds parallax by default, so check a calm brief on a minimalist site.
    const calm = sampleProject('', 2, { atmosphere: 'minimalist' });
    const r = applyCommand(calm, { kind: 'updateStyle', pageId: calm.pages[0].id, sectionId: sectionOf(calm, 'hero').id, patch: { variant: 'fullbleed' } }, ids);
    if (!r.ok) throw new Error(r.error);
    expect(render(r.project)).toContain('<div class="dw-hero-bg dw-plx-placeholder"></div>');
    expect(without).toContain('dw-v-fullbleed');
  });

  it('migrates version 2 projects to the standard layout', () => {
    const v3 = sampleProject();
    const v2 = structuredClone(v3) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    v2.schemaVersion = 2;
    for (const s of v2.pages[0].sections) delete s.style.variant;
    const loaded = new ProjectStore(memoryStore()).parse(JSON.stringify(v2));
    expect(loaded.schemaVersion).toBe(4);
    expect(loaded.pages[0].sections.every((s) => s.style.variant === 'standard')).toBe(true);
  });
});
