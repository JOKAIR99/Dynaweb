import { describe, expect, it } from 'vitest';
import { proposeDirections } from '../src/generator/direction';
import { applyCommand } from '../src/model/commands';
import { createSection } from '../src/model/defaults';
import { createSequentialIds } from '../src/model/ids';
import { renderSection, safeVideo } from '../src/render/html';
import { structuredData } from '../src/render/seo';
import { ProjectStore, memoryStore } from '../src/storage/projectStore';
import { sampleMeta, sampleProject } from './helpers';

const ids = createSequentialIds(9700);

describe('schema v5 migration (universal brief)', () => {
  function asV4(meta: Record<string, unknown>) {
    const p = structuredClone(sampleProject()) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    p.schemaVersion = 4;
    for (const k of ['purpose', 'description', 'activity', 'colors', 'typography', 'imagery', 'layout', 'motion', 'features', 'technical', 'schemaType']) delete p.meta[k];
    Object.assign(p.meta, meta);
    for (const s of p.pages[0].sections) delete s.content.videoUrl;
    return JSON.stringify(p);
  }

  it('keeps the old sector as free-text activity and drops the fixed list', () => {
    const loaded = new ProjectStore(memoryStore()).parse(asV4({ sector: 'hotel', businessType: '', industry: 'hotel' }));
    expect(loaded.schemaVersion).toBe(5);
    expect(loaded.meta.activity).toBe('Hotel');
    expect(loaded.meta).not.toHaveProperty('sector');
    expect(loaded.meta).not.toHaveProperty('industry');
    expect(loaded.pages[0].sections.every((s) => s.content.videoUrl === '')).toBe(true);
  });

  it('prefers the owner business type over the sector label, and leaves "other" empty', () => {
    const store = new ProjectStore(memoryStore());
    expect(store.parse(asV4({ sector: 'tourism', businessType: 'Kayak school' })).meta).toMatchObject({ activity: 'Kayak school', description: 'Kayak school' });
    expect(store.parse(asV4({ sector: 'other', businessType: '' })).meta.activity).toBe('');
  });
});

describe('universal building blocks', () => {
  it('renders text as paragraphs split on blank lines', () => {
    const s = createSection('text', ids);
    s.content.body = 'First paragraph.\n\nSecond <b>one</b>.';
    const html = renderSection(s);
    expect(html).toContain('<div class="dw-prose" data-dw-el="body"><p>First paragraph.</p><p>Second &lt;b&gt;one&lt;/b&gt;.</p></div>');
  });

  it('accepts only safe video links and embeds YouTube and Vimeo privately', () => {
    expect(safeVideo('https://cdn.example.com/reel.mp4')).toEqual({ kind: 'file', src: 'https://cdn.example.com/reel.mp4' });
    expect(safeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
    expect(safeVideo('https://vimeo.com/123456789')).toEqual({ kind: 'embed', src: 'https://player.vimeo.com/video/123456789?dnt=1' });
    expect(safeVideo('http://cdn.example.com/reel.mp4')).toBeNull();
    expect(safeVideo('javascript:alert(1)')).toBeNull();
    expect(safeVideo('https://evil.example/embed"><script>')).toBeNull();
  });

  it('renders a media section as a captioned video with a poster', () => {
    const s = createSection('media', ids);
    s.content.videoUrl = 'https://cdn.example.com/reel.webm';
    s.content.imageUrl = 'https://cdn.example.com/poster.jpg';
    const html = renderSection(s);
    expect(html).toMatch(/<video class="dw-video" src="https:\/\/cdn\.example\.com\/reel\.webm" controls playsinline preload="metadata" poster="https:\/\/cdn\.example\.com\/poster\.jpg"/);
    expect(html).toContain('<figcaption class="dw-muted" data-dw-el="subheading">[Caption]</figcaption>');
  });

  it('falls back to an image when the video link is not allowed', () => {
    const s = createSection('media', ids);
    s.content.videoUrl = 'http://insecure.example/clip.mp4';
    expect(renderSection(s)).not.toContain('<video');
  });

  it('lets a custom section hold text, media, buttons and items together', () => {
    let p = sampleProject('', 1, {}, ['custom']);
    const at = { pageId: p.pages[0].id, sectionId: p.pages[0].sections[0].id };
    const r1 = applyCommand(p, { kind: 'updateContent', ...at, patch: { videoUrl: 'https://youtu.be/dQw4w9WgXcQ', primaryAction: { label: 'Join', href: '#join' } } }, ids);
    if (!r1.ok) throw new Error(r1.error);
    const r2 = applyCommand(r1.project, { kind: 'addItem', ...at }, ids);
    if (!r2.ok) throw new Error(r2.error);
    p = r2.project;
    const html = renderSection(p.pages[0].sections[0]);
    expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(html).toContain('>Join</a>');
    expect(html).toContain('<article class="dw-card"');
  });
});

describe('industry-neutral output', () => {
  it('uses the schema.org type the owner chose, Organization otherwise', () => {
    const plain = sampleProject();
    expect(structuredData(plain, plain.pages[0])['@type']).toBe('Organization');
    const person = sampleProject('', 1, { schemaType: 'Person' });
    expect(structuredData(person, person.pages[0])['@type']).toBe('Person');
  });

  it('rejects a schema type that is not a plain name', () => {
    const p = sampleProject();
    expect(applyCommand(p, { kind: 'updateMeta', patch: { schemaType: 'Thing"><script>' } }, ids).ok).toBe(false);
  });

  it('lets the owner colour words steer the art direction', () => {
    const dark = proposeDirections(sampleMeta({ atmosphere: 'other', colors: 'dark with gold' }), 'X')[0];
    expect(dark.presetId).toBe('nocturne');
    const blue = proposeDirections(sampleMeta({ atmosphere: 'other', colors: 'electric blue' }), 'X')[0];
    expect(blue.presetId).toBe('quarry');
  });

  it('uses the owner imagery direction when given', () => {
    const own = proposeDirections(sampleMeta({ imagery: 'Hand-drawn diagrams only' }), 'X')[0];
    expect(own.imagery).toBe('Hand-drawn diagrams only');
  });
});
