import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/model/commands';
import { createSequentialIds } from '../src/model/ids';
import { countPlaceholders, esc, renderPage, safeHref, safeImage } from '../src/render/html';
import { sampleProject } from './helpers';

const render = (p = sampleProject(), mode: 'editor' | 'export' = 'export') => renderPage(p, { mode, runtimeJs: '/*rt*/' });

describe('renderer', () => {
  it('exports a complete standalone document with SEO basics', () => {
    const html = render();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Andaman Charters</title>');
    expect(html).toContain('<meta name="description" content="Booking requests">');
    expect(html).toContain('/*rt*/');
    expect(html).not.toContain('dynaweb-canvas'); // no editor wiring in exports
  });

  it('renders every section with its id, in model order', () => {
    const p = sampleProject();
    const html = render(p);
    const positions = p.pages[0].sections.map((s) => html.indexOf(`data-dw-id="${s.id}"`));
    expect(positions.every((x) => x > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('writes animation configuration as data attributes', () => {
    const html = render();
    expect(html).toMatch(/data-dw-parallax="\{&quot;speed&quot;:0.35/);
    expect(html).toContain('data-dw-horizontal=');
    expect(html).toContain('data-dw-reveal=');
    expect(html).toContain('class="dw-h-track"');
  });

  it('omits disabled animations', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const r = applyCommand(p, { kind: 'updateAnimation', pageId: p.pages[0].id, sectionId: hero.id, animationId: hero.animations[0].id, enabled: false }, createSequentialIds(900));
    if (!r.ok) throw new Error(r.error);
    expect(render(r.project)).not.toContain('data-dw-parallax');
  });

  it('escapes user text and blocks unsafe urls', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const r = applyCommand(p, {
      kind: 'updateContent', pageId: p.pages[0].id, sectionId: hero.id,
      patch: { heading: '<script>alert(1)</script>', primaryAction: { label: 'Go', href: 'javascript:alert(1)' } },
    }, createSequentialIds(900));
    if (!r.ok) throw new Error(r.error);
    const html = render(r.project);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('javascript:alert');
    expect(safeHref('https://x.test')).toBe('https://x.test');
    expect(safeHref('[booking link]')).toBe('#');
    expect(safeImage('http://insecure.test/a.jpg')).toBeNull();
    expect(esc(`"'&`)).toBe('&quot;&#39;&amp;');
  });

  it('keeps every colour and font behind :root tokens and honours reduced motion', () => {
    const html = render();
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const afterRoot = css.slice(css.indexOf('}') + 1);
    expect(afterRoot).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(css).toContain('overflow-x: clip');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).not.toContain('transition: all');
  });

  it('adds selection wiring in editor mode only', () => {
    expect(render(sampleProject(), 'editor')).toContain('dynaweb-canvas');
  });

  it('applies per-device visibility classes', () => {
    const p = sampleProject();
    const hero = p.pages[0].sections[1];
    const r = applyCommand(p, { kind: 'updateStyle', pageId: p.pages[0].id, sectionId: hero.id, patch: { hidden: { desktop: false, tablet: false, mobile: true } } }, createSequentialIds(900));
    if (!r.ok) throw new Error(r.error);
    expect(render(r.project)).toContain('dw-hide-mobile');
  });

  it('counts placeholders so export can warn', () => {
    expect(countPlaceholders(sampleProject())).toBeGreaterThan(5);
  });
});
