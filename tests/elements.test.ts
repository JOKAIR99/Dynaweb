import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/model/commands';
import type { Command } from '../src/model/commands';
import { createSequentialIds } from '../src/model/ids';
import type { Project } from '../src/model/schema';
import { renderPage } from '../src/render/html';
import { ProjectStore, memoryStore } from '../src/storage/projectStore';
import { sampleProject } from './helpers';
import RUNTIME from '../src/runtime/engine.js?raw';

const ids = createSequentialIds(9500);
const sectionOf = (p: Project, type: string) => p.pages[0].sections.find((s) => s.type === type)!;
function run(p: Project, cmd: Command): Project {
  const r = applyCommand(p, cmd, ids);
  if (!r.ok) throw new Error(r.error);
  return r.project;
}
const onSection = (p: Project, type: string) => ({ pageId: p.pages[0].id, sectionId: sectionOf(p, type).id });

describe('element animation commands', () => {
  it('adds, updates, disables and removes a reveal on one element', () => {
    let p = sampleProject();
    const at = onSection(p, 'about');
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading' });
    expect(sectionOf(p, 'about').elementAnimations).toHaveLength(1);
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading', settings: { effect: 'zoom-in', duration: 1500 } });
    expect(sectionOf(p, 'about').elementAnimations[0].settings).toMatchObject({ effect: 'zoom-in', duration: 1500 });
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading', enabled: false });
    expect(sectionOf(p, 'about').elementAnimations[0].enabled).toBe(false);
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading', remove: true });
    expect(sectionOf(p, 'about').elementAnimations).toHaveLength(0);
  });

  it('rejects unknown elements, missing items and out-of-range settings', () => {
    const p = sampleProject();
    const at = onSection(p, 'services');
    expect(applyCommand(p, { kind: 'setElementAnimation', ...at, element: 'footerlogo' }, ids).ok).toBe(false);
    expect(applyCommand(p, { kind: 'setElementAnimation', ...at, element: 'item:item_zzzz' }, ids).ok).toBe(false);
    expect(applyCommand(p, { kind: 'setElementAnimation', ...at, element: 'heading', settings: { duration: 99999 } }, ids).ok).toBe(false);
  });

  it('removes an item animation together with the item', () => {
    let p = sampleProject();
    const at = onSection(p, 'services');
    const item = sectionOf(p, 'services').content.items[0];
    p = run(p, { kind: 'setElementAnimation', ...at, element: `item:${item.id}` });
    p = run(p, { kind: 'removeItem', ...at, itemId: item.id });
    expect(sectionOf(p, 'services').elementAnimations).toHaveLength(0);
  });

  it('re-keys item animations when a section is duplicated', () => {
    let p = sampleProject();
    const at = onSection(p, 'services');
    const item = sectionOf(p, 'services').content.items[1];
    p = run(p, { kind: 'setElementAnimation', ...at, element: `item:${item.id}` });
    p = run(p, { kind: 'duplicateSection', ...at });
    const copy = p.pages[0].sections.filter((s) => s.type === 'services')[1];
    expect(copy.elementAnimations[0].element).toBe(`item:${copy.content.items[1].id}`);
    expect(copy.elementAnimations[0].id).not.toBe(sectionOf(p, 'services').elementAnimations[0].id);
  });
});

describe('element keys in the renderer', () => {
  it('marks headings, text, images, buttons and items with stable keys', () => {
    const p = sampleProject();
    const html = renderPage(p, { mode: 'export', runtimeJs: '' });
    expect(html).toMatch(/<h1 data-dw-el="heading">/);
    expect(html).toMatch(/<p class="dw-lead dw-muted" data-dw-el="subheading">/);
    expect(html).toMatch(/<a class="dw-btn" data-dw-el="primary"/);
    const item = sectionOf(p, 'services').content.items[0];
    expect(html).toContain(`data-dw-el="item:${item.id}"`);
  });

  it('adds reveal settings only for enabled element animations', () => {
    let p = sampleProject();
    const at = onSection(p, 'about');
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading', settings: { effect: 'rotate' } });
    expect(renderPage(p, { mode: 'export', runtimeJs: '' })).toMatch(/<h2 data-dw-el="heading" data-dw-el-reveal="\{&quot;effect&quot;:&quot;rotate&quot;/);
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading', enabled: false });
    expect(renderPage(p, { mode: 'export', runtimeJs: '' })).not.toContain('data-dw-el-reveal');
  });
});

describe('element animation runtime', () => {
  it('gives the element its own settings and keeps it out of the section reveal', () => {
    let p = sampleProject();
    const at = onSection(p, 'about');
    // About's section reveal targets its children; give the heading its own 1500 ms zoom.
    p = run(p, { kind: 'setElementAnimation', ...at, element: 'heading', settings: { effect: 'zoom-in', duration: 1500 } });
    const dom = new JSDOM(renderPage(p, { mode: 'export', runtimeJs: '' }), { runScripts: 'outside-only' });
    const win = dom.window as unknown as Window & Record<string, unknown>;
    win.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
    win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} } as never;
    win.__DW_NO_AUTOSTART__ = true;
    (dom.window as unknown as { eval: (c: string) => void }).eval(RUNTIME);
    (win.DynawebRuntime as { create: (d: Document) => { init: () => void } }).create(win.document).init();
    const about = win.document.querySelector('.dw-about')!;
    const heading = about.querySelector('h2') as HTMLElement;
    expect(heading.classList.contains('dw-rv')).toBe(true);
    expect(heading.style.getPropertyValue('--dw-rv-dur')).toBe('1500ms');
    expect(heading.style.getPropertyValue('--dw-rv-t')).toMatch(/^scale\(/);
    // The column that contains the heading is no longer a section-reveal target.
    const column = heading.parentElement as HTMLElement;
    expect(column.classList.contains('dw-rv')).toBe(false);
  });
});

describe('schema v4 migration', () => {
  it('adds empty element animations to version 3 projects', () => {
    const v4 = sampleProject();
    const v3 = structuredClone(v4) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    v3.schemaVersion = 3;
    for (const s of v3.pages[0].sections) delete s.elementAnimations;
    const loaded = new ProjectStore(memoryStore()).parse(JSON.stringify(v3));
    expect(loaded.schemaVersion).toBe(5);
    expect(loaded.pages[0].sections.every((s) => Array.isArray(s.elementAnimations) && s.elementAnimations.length === 0)).toBe(true);
  });
});
