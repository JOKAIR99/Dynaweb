import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../src/render/html';
import { sampleProject } from './helpers';
import RUNTIME from '../src/runtime/engine.js?raw';


interface FakeIO { targets: Element[]; fire: (el: Element, isIntersecting: boolean, top?: number) => void; disconnected: boolean }

function setup(opts: { reducedMotion?: boolean; width?: number; html?: string; finePointer?: boolean } = {}) {
  const html = opts.html ?? renderPage(sampleProject(), { mode: 'export', runtimeJs: '' });
  const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const win = dom.window as unknown as Window & Record<string, unknown>;
  const observers: FakeIO[] = [];
  Object.defineProperty(win, 'innerWidth', { value: opts.width ?? 1280, configurable: true });
  Object.defineProperty(win, 'innerHeight', { value: 800, configurable: true });
  win.matchMedia = ((q: string) => ({
    matches: (q.includes('reduce') && !!opts.reducedMotion) || (q.includes('pointer: fine') && !!opts.finePointer),
    addEventListener() {}, removeEventListener() {},
  })) as never;
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

describe('runtime: forms', () => {
  const withEndpoint = (endpoint: string) => {
    const p = sampleProject();
    const contact = p.pages[0].sections.find((s) => s.type === 'contact')!;
    contact.content.formEndpoint = endpoint;
    return renderPage(p, { mode: 'export', runtimeJs: '' });
  };
  const fill = (doc: Document, values: Record<string, string>) => {
    for (const [name, value] of Object.entries(values)) (doc.querySelector(`form [name="${name}"]`) as HTMLInputElement).value = value;
  };
  const submit = (doc: Document) => doc.querySelector('form')!.dispatchEvent(new doc.defaultView!.Event('submit', { cancelable: true }));
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('blocks submission and explains each invalid field', () => {
    const { doc, runtime } = setup();
    runtime.init();
    fill(doc, { email: 'not-an-email' });
    submit(doc);
    const email = doc.querySelector('form [name="email"]') as HTMLInputElement;
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(doc.getElementById(`${email.id}-err`)!.textContent).toContain('valid email');
    expect(doc.activeElement?.getAttribute('name')).toBe('name'); // first invalid field gets focus
  });

  it('works under reduced motion too', () => {
    const { doc, runtime } = setup({ reducedMotion: true });
    runtime.init();
    submit(doc);
    expect((doc.querySelector('form [name="name"]') as HTMLElement).getAttribute('aria-invalid')).toBe('true');
  });

  it('never pretends to send when no endpoint is configured', () => {
    const { doc, runtime } = setup();
    runtime.init();
    fill(doc, { name: 'Ana', email: 'ana@example.com', date: '2999-01-01', guests: '2' });
    submit(doc);
    expect(doc.querySelector('.dw-form-status')!.textContent).toContain('not connected yet');
  });

  it('rejects a date in the past', () => {
    const { doc, runtime } = setup();
    runtime.init();
    fill(doc, { name: 'Ana', email: 'ana@example.com', date: '2001-01-01', guests: '2' });
    submit(doc);
    const date = doc.querySelector('form [name="date"]') as HTMLInputElement;
    expect(doc.getElementById(`${date.id}-err`)!.textContent).toContain('from today');
  });

  it('posts to the endpoint and reports success honestly', async () => {
    const { win, doc, runtime } = setup({ html: withEndpoint('https://forms.example/f/1') });
    const calls: string[] = [];
    win.fetch = ((url: string) => { calls.push(url); return Promise.resolve({ ok: true, status: 200 }); }) as never;
    runtime.init();
    fill(doc, { name: 'Ana', email: 'ana@example.com', date: '2999-01-01', guests: '3' });
    submit(doc);
    expect(doc.querySelector('.dw-form-status')!.textContent).toBe('Sending...');
    expect((doc.querySelector('form button') as HTMLButtonElement).disabled).toBe(true);
    await flush(); await flush();
    expect(calls).toEqual(['https://forms.example/f/1']);
    expect(doc.querySelector('.dw-form-status')!.textContent).toContain('not a confirmed booking yet');
    expect((doc.querySelector('form button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('reports a failed request instead of success', async () => {
    const { win, doc, runtime } = setup({ html: withEndpoint('https://forms.example/f/1') });
    win.fetch = (() => Promise.resolve({ ok: false, status: 500 })) as never;
    runtime.init();
    fill(doc, { name: 'Ana', email: 'ana@example.com', date: '2999-01-01', guests: '3' });
    submit(doc);
    await flush(); await flush();
    expect(doc.querySelector('.dw-form-status')!.textContent).toContain('Sending failed');
  });

  it('drops bot submissions caught by the honeypot without sending', () => {
    const { win, doc, runtime } = setup({ html: withEndpoint('https://forms.example/f/1') });
    let sent = false;
    win.fetch = (() => { sent = true; return Promise.resolve({ ok: true }); }) as never;
    runtime.init();
    fill(doc, { name: 'Bot', email: 'bot@example.com', date: '2999-01-01', guests: '3', company_website: 'spam' });
    submit(doc);
    expect(sent).toBe(false);
    expect(doc.querySelector('.dw-form-status')!.textContent).toBe('');
  });
});

describe('runtime: magnetic buttons', () => {
  it('follows the pointer on fine pointers only and resets on leave', () => {
    const fine = setup({ finePointer: true });
    fine.runtime.init();
    const btn = fine.doc.querySelector('.dw-btn') as HTMLElement;
    btn.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    const Ev = fine.win.MouseEvent as typeof MouseEvent;
    btn.dispatchEvent(new Ev('pointermove', { clientX: 100, clientY: 40 }));
    expect(btn.style.transform).toBe('translate3d(12.0px,7.0px,0)');
    btn.dispatchEvent(new Ev('pointerleave'));
    expect(btn.style.transform).toBe('');

    const touch = setup({ finePointer: false });
    touch.runtime.init();
    expect(touch.doc.querySelector('.dw-magnet')).toBeNull();
  });
});

describe('runtime: form messages follow the page language', () => {
  it('shows French messages on a French site and English ones otherwise', () => {
    const fr = sampleProject('', 2, { language: 'fr', languages: ['fr'] });
    const { doc, runtime } = setup({ html: renderPage(fr, { mode: 'export', runtimeJs: '' }) });
    runtime.init();
    doc.querySelector('form')!.dispatchEvent(new doc.defaultView!.Event('submit', { cancelable: true }));
    const name = doc.querySelector('form [name="name"]') as HTMLInputElement;
    expect(doc.getElementById(`${name.id}-err`)!.textContent).toBe('Merci de remplir ce champ.');
    const en = setup();
    en.runtime.init();
    en.doc.querySelector('form')!.dispatchEvent(new en.doc.defaultView!.Event('submit', { cancelable: true }));
    const enName = en.doc.querySelector('form [name="name"]') as HTMLInputElement;
    expect(en.doc.getElementById(`${enName.id}-err`)!.textContent).toBe('Please fill in this field.');
  });
});
