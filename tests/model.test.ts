import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/model/commands';
import { createSequentialIds } from '../src/model/ids';
import { validateProject } from '../src/model/schema';
import { sampleProject } from './helpers';

const ids = createSequentialIds(5000);
const now = () => '2026-11-07T11:00:00.000Z';

function apply(project = sampleProject(), cmd: Parameters<typeof applyCommand>[1]) {
  const result = applyCommand(project, cmd, ids, now);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

describe('project generation', () => {
  it('produces a schema-valid project with deterministic ids', () => {
    const a = sampleProject();
    const b = sampleProject();
    expect(validateProject(a).ok).toBe(true);
    expect(a).toEqual(b);
  });

  it('switches on animations from the brief', () => {
    const sections = sampleProject().pages[0].sections;
    expect(sections.find((s) => s.type === 'hero')?.animations.map((a) => a.type)).toEqual(['parallax']);
    expect(sections.find((s) => s.type === 'gallery')?.animations.map((a) => a.type)).toEqual(['horizontal']);
    expect(sections.find((s) => s.type === 'about')?.animations.map((a) => a.type)).toEqual(['reveal']);
  });

  it('adds no animation when motion intensity is none', () => {
    const sections = sampleProject('parallax horizontal', 0).pages[0].sections;
    expect(sections.every((s) => s.animations.length === 0)).toBe(true);
  });

  it('never invents business facts: unknown content is a [placeholder]', () => {
    const hero = sampleProject().pages[0].sections.find((s) => s.type === 'hero');
    expect(hero?.content.heading).toMatch(/^\[.*\]$/);
    const footer = sampleProject().pages[0].sections.find((s) => s.type === 'footer');
    expect(footer?.content.body).toMatch(/^\[.*\]$/);
  });
});

describe('section commands', () => {
  it('adds a section at an index and removes it', () => {
    const p = sampleProject();
    const page = p.pages[0];
    const added = apply(p, { kind: 'addSection', pageId: page.id, sectionType: 'features', index: 1 });
    expect(added.pages[0].sections[1].type).toBe('features');
    expect(added.pages[0].sections).toHaveLength(page.sections.length + 1);
    const removed = apply(added, { kind: 'removeSection', pageId: page.id, sectionId: added.pages[0].sections[1].id });
    expect(removed.pages[0].sections.map((s) => s.id)).toEqual(page.sections.map((s) => s.id));
  });

  it('moves a section and clamps the target index', () => {
    const p = sampleProject();
    const page = p.pages[0];
    const first = page.sections[0].id;
    const moved = apply(p, { kind: 'moveSection', pageId: page.id, sectionId: first, toIndex: 99 });
    expect(moved.pages[0].sections.at(-1)?.id).toBe(first);
    expect(moved.pages[0].sections).toHaveLength(page.sections.length);
  });

  it('duplicates a section with fresh ids', () => {
    const p = sampleProject();
    const gallery = p.pages[0].sections.find((s) => s.type === 'gallery')!;
    const out = apply(p, { kind: 'duplicateSection', pageId: p.pages[0].id, sectionId: gallery.id });
    const copies = out.pages[0].sections.filter((s) => s.type === 'gallery');
    expect(copies).toHaveLength(2);
    expect(copies[1].id).not.toBe(copies[0].id);
    expect(copies[1].content.items[0].id).not.toBe(copies[0].content.items[0].id);
  });

  it('does not mutate the input project', () => {
    const p = sampleProject();
    const snapshot = structuredClone(p);
    apply(p, { kind: 'updateContent', pageId: p.pages[0].id, sectionId: p.pages[0].sections[1].id, patch: { heading: 'Hello' } });
    expect(p).toEqual(snapshot);
  });

  it('updates properties and stamps updatedAt', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const out = apply(p, { kind: 'updateStyle', pageId: p.pages[0].id, sectionId: hero.id, patch: { paddingY: 40, align: 'end' } });
    expect(out.pages[0].sections[1].style).toMatchObject({ paddingY: 40, align: 'end' });
    expect(out.updatedAt).toBe(now());
  });

  it('rejects values outside the schema and leaves the project unchanged', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const result = applyCommand(p, { kind: 'updateStyle', pageId: p.pages[0].id, sectionId: hero.id, patch: { paddingY: 9999 } }, ids, now);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown ids', () => {
    const result = applyCommand(sampleProject(), { kind: 'removeSection', pageId: 'page_nope', sectionId: 'sec_x' }, ids, now);
    expect(result).toEqual({ ok: false, error: 'page not found: page_nope' });
  });

  it('rejects an invalid theme colour', () => {
    const result = applyCommand(sampleProject(), { kind: 'updateTheme', patch: { colors: { accent: 'red' } } }, ids, now);
    expect(result.ok).toBe(false);
  });
});

describe('animation commands', () => {
  it('adds, updates and removes a reveal animation', () => {
    const p = sampleProject('', 0);
    const page = p.pages[0];
    const hero = page.sections[1];
    const added = apply(p, { kind: 'addAnimation', pageId: page.id, sectionId: hero.id, animationType: 'reveal' });
    const anim = added.pages[0].sections[1].animations[0];
    expect(anim.type).toBe('reveal');
    const updated = apply(added, { kind: 'updateAnimation', pageId: page.id, sectionId: hero.id, animationId: anim.id, settings: { effect: 'blur', duration: 1200 }, enabled: false });
    const after = updated.pages[0].sections[1].animations[0];
    expect(after.enabled).toBe(false);
    expect(after.type === 'reveal' && after.settings).toMatchObject({ effect: 'blur', duration: 1200 });
    const removed = apply(updated, { kind: 'removeAnimation', pageId: page.id, sectionId: hero.id, animationId: anim.id });
    expect(removed.pages[0].sections[1].animations).toHaveLength(0);
  });

  it('refuses parallax and horizontal on the same section', () => {
    const p = sampleProject();
    const gallery = p.pages[0].sections.find((s) => s.type === 'gallery')!;
    const result = applyCommand(p, { kind: 'addAnimation', pageId: p.pages[0].id, sectionId: gallery.id, animationType: 'parallax' }, ids, now);
    expect(result).toMatchObject({ ok: false });
  });

  it('refuses a duplicate animation type', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const result = applyCommand(p, { kind: 'addAnimation', pageId: p.pages[0].id, sectionId: hero.id, animationType: 'parallax' }, ids, now);
    expect(result.ok).toBe(false);
  });

  it('validates animation settings ranges', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const result = applyCommand(p, { kind: 'updateAnimation', pageId: p.pages[0].id, sectionId: hero.id, animationId: hero.animations[0].id, settings: { speed: 5 } }, ids, now);
    expect(result.ok).toBe(false);
  });
});
