import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../src/render/html';
import { sampleProject } from './helpers';
import RUNTIME from '../src/runtime/engine.js?raw';


interface FakeIO { targets: Element[]; fire: (el: Element, isIntersecting: boolean, top?: number) => void; disconnected: boolean }

function setup(opts: { reducedMotion?: boolean; width?: number; html?: string } = {}) {
  const html = opts.html ?? renderPage(sampleProject(), { mode: 'export', runtimeJs: '' });
  const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const win = dom.window as unknown as Window & Record<string, unknown>;
  const observers: FakeIO[] = [];
  Object.defineProperty(win, 'innerWidth', { value: opts.width ?? 1280, configurable: true });
  Object.defineProperty(win, 'innerHeight', { value: 800, configurable: true });
  win.matchMedia = ((q: string) => ({ matches: q.includes('reduce') && !!opts.reducedMotion, addEventListener() {}, removeEventListener() {} })) as never;
  win.IntersectionObserver = class {
    targets: Element[] = [];
    disconnected = false;
    constructor(private cb: (e: unknown[]) => void) { observers.push(this as unknown as FakeIO); }
    observe(el: Element) { this.targets.push(el); }
    unobserve(el: Element) { this.targets = this.targets.filter((t) => t !== el); }
    disconnect() { this.disconnected = true; this.targets = []; }
    fire(el: Element, isIntersecting: boolean, top = 100) { this.cb([{ target: el, isIntersecting, boundingClientRect: { top } }]); }
  } as never;
  const listeners: Record<string, number> = {};
  const add = win.addEventListener.bind(win);
  const remove = win.removeEventListener.bind(win);
  win.addEventListener = ((t: string, fn: never, o: never) => { listeners[t] = (listeners[t] ?? 0) + 1; add(t, fn, o); }) as never;
  win.removeEventListener = ((t: string, fn: never, o: never) => { listeners[t] = (listeners[t] ?? 0) - 1; remove(t, fn, o); }) as never;
  win.__DW_NO_AUTOSTART__ = true;
  (dom.window as unknown as { eval: (code: string) => void }).eval(RUNTIME);
  const api = win.DynawebRuntime as { create: (d: Document) => { init: () => unknown; destroy: () => void; update: () => void } };
  const runtime = api.create(win.document);
  return { win, doc: win.document, runtime, observers, listeners };
}

const section = (doc: Document, type: string) => doc.querySelector(`.dw-${type}`) as HTMLElement;

describe('runtime: scroll reveal', () => {
  it('hides targets only after init and reveals them on intersection', () => {
    const { doc, runtime, observers } = setup();
    const about = section(doc, 'about');
    expect(about.querySelector('.dw-rv')).toBeNull(); // static, visible content before JS
    runtime.init();
    expect(doc.documentElement.classList.contains('dw-js')).toBe(true);
    const targets = Array.from(about.querySelectorAll('.dw-rv')) as HTMLElement[];
    expect(targets.length).toBeGreaterThan(1);
    expect(targets[1].style.getPropertyValue('--dw-rv-delay')).toBe('90ms'); // stagger
    const io = observers.find((o) => o.targets.includes(targets[0]))!;
    io.fire(targets[0], true);
    expect(targets[0].classList.contains('dw-in')).toBe(true);
    expect(io.targets.includes(targets[0])).toBe(false); // once: unobserved
  });

  it('replays when once is false', () => {
    const p = sampleProject();
    const about = p.pages[0].sections.find((s) => s.type === 'about')!;
    const anim = about.animations[0];
    if (anim.type === 'reveal') anim.settings.once = false;
    const { doc, runtime, observers } = setup({ html: renderPage(p, { mode: 'export', runtimeJs: '' }) });
    runtime.init();
    const el = section(doc, 'about').querySelector('.dw-rv') as HTMLElement;
    const io = observers.find((o) => o.targets.includes(el))!;
    io.fire(el, true);
    io.fire(el, false);
    expect(el.classList.contains('dw-in')).toBe(false);
  });

  it('does nothing under prefers-reduced-motion', () => {
    const { doc, runtime, observers, listeners } = setup({ reducedMotion: true });
    runtime.init();
    expect(doc.querySelector('.dw-rv')).toBeNull();
    expect(observers).toHaveLength(0);
    expect(listeners.scroll ?? 0).toBe(0);
    expect(doc.documentElement.classList.contains('dw-js')).toBe(false);
  });
});

describe('runtime: parallax', () => {
  it('moves layers by speed relative to the viewport', () => {
    const { doc, runtime } = setup();
    const hero = section(doc, 'hero');
    hero.getBoundingClientRect = () => ({ top: -400, height: 800, bottom: 400 }) as DOMRect;
    runtime.init();
    const layer = hero.querySelector('.dw-plx-layer') as HTMLElement;
    const content = hero.querySelector('.dw-inner') as HTMLElement;
    expect(layer.style.transform).toMatch(/^translate3d\(0\.00px,[0-9.]+px,0\) scale\(1\.1\)$/);
    const layerY = parseFloat(layer.style.transform.split(',')[1]);
    const contentY = parseFloat(content.style.transform.split(',')[1]);
    expect(layerY).toBeGreaterThan(0);
    expect(contentY).toBeLessThan(0); // foreground moves the other way: depth
  });
});

describe('runtime: horizontal scroll', () => {
  it('pins the section and translates the track with scroll progress', () => {
    const { doc, runtime } = setup();
    const gallery = section(doc, 'gallery');
    const track = gallery.querySelector('.dw-h-track') as HTMLElement;
    Object.defineProperty(track, 'scrollWidth', { value: 3280 });
    runtime.init();
    expect(gallery.classList.contains('dw-h-active')).toBe(true);
    expect(gallery.style.height).toBe('2800px'); // 800 + (3280 - 1280) / speed 1
    gallery.getBoundingClientRect = () => ({ top: -1000, height: 2800, bottom: 1800 }) as DOMRect;
    runtime.update();
    expect(track.style.transform).toBe('translate3d(-1000.0px,0,0)');
    expect(gallery.style.getPropertyValue('--dw-h-p')).toBe('0.5000');
    expect(gallery.querySelectorAll('.dw-h-dots i.on')).toHaveLength(1);
  });

  it('falls back to a vertical layout on mobile', () => {
    const { doc, runtime } = setup({ width: 390 });
    runtime.init();
    const gallery = section(doc, 'gallery');
    expect(gallery.classList.contains('dw-h-active')).toBe(false);
    expect(gallery.style.height).toBe('');
  });
});

describe('runtime: cleanup', () => {
  it('removes listeners, observers and inline styles on destroy', () => {
    const { doc, runtime, observers, listeners } = setup();
    runtime.init();
    expect(listeners.scroll).toBe(1);
    runtime.destroy();
    expect(listeners.scroll).toBe(0);
    expect(listeners.resize).toBe(0);
    expect(observers.every((o) => o.disconnected)).toBe(true);
    expect(doc.querySelector('.dw-rv, .dw-h-active')).toBeNull();
    expect((section(doc, 'hero').querySelector('.dw-plx-layer') as HTMLElement).style.transform).toBe('');
  });

  it('init twice does not stack listeners', () => {
    const { runtime, listeners } = setup();
    runtime.init();
    runtime.init();
    expect(listeners.scroll).toBe(1);
  });
});
