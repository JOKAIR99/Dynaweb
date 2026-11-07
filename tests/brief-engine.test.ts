import { describe, expect, it } from 'vitest';
import { buildMasterPrompt } from '../src/ai/masterPrompt';
import { proposeDirections } from '../src/generator/direction';
import { planSections } from '../src/generator/generate';
import { applyCommand } from '../src/model/commands';
import { createSequentialIds } from '../src/model/ids';
import { SCHEMA_VERSION } from '../src/model/schema';
import { anchorFor, renderPage, safeEndpoint } from '../src/render/html';
import { buildRobots, buildSitemap, headTags, structuredData } from '../src/render/seo';
import { ProjectStore, memoryStore } from '../src/storage/projectStore';
import { sampleMeta, sampleProject } from './helpers';

const ids = createSequentialIds(7000);
const render = (p = sampleProject()) => renderPage(p, { mode: 'export', runtimeJs: '' });

describe('structure planner', () => {
  it('builds a booking site for tourism with a booking form and no invented proof', () => {
    expect(planSections(sampleMeta())).toEqual(['navigation', 'hero', 'about', 'services', 'gallery', 'testimonials', 'pricing', 'cta', 'contact', 'footer']);
  });

  it('drops pricing and testimonials for a branding site', () => {
    const plan = planSections(sampleMeta({ sector: 'other', goal: 'branding', brief: '' }));
    expect(plan).not.toContain('pricing');
    expect(plan).not.toContain('testimonials');
    expect(plan).toContain('contact');
  });

  it('does not add pricing for restaurant reservations', () => {
    expect(planSections(sampleMeta({ sector: 'restaurant' }))).not.toContain('pricing');
  });

  it('uses a booking form when the goal is bookings and an inquiry form otherwise', () => {
    const contact = (goal: 'bookings' | 'leads') => sampleProject('', 2, { goal }).pages[0].sections.find((s) => s.type === 'contact')!;
    expect(contact('bookings').content.formKind).toBe('booking');
    expect(contact('leads').content.formKind).toBe('inquiry');
  });

  it('uses the real location and nothing else that was not given', () => {
    const p = sampleProject('', 2, { location: 'Krabi, Thailand' });
    const footer = p.pages[0].sections.find((s) => s.type === 'footer')!;
    expect(footer.content.body).toBe('Krabi, Thailand. [Contact details]');
  });
});

describe('art direction', () => {
  it('is deterministic for the same brief', () => {
    expect(proposeDirections(sampleMeta(), 'A')).toEqual(proposeDirections(sampleMeta(), 'A'));
  });

  it('ranks presets that fit the atmosphere first', () => {
    const top = proposeDirections(sampleMeta({ atmosphere: 'natural', sector: 'tourism' }), 'A')[0];
    expect(['lagoon', 'canopy']).toContain(top.presetId);
  });

  it('gives different businesses with the same brief a different first proposal at least sometimes', () => {
    const firsts = new Set(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map((n) => proposeDirections(sampleMeta(), n)[0].presetId));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('returns three distinct proposals with reasoning', () => {
    const list = proposeDirections(sampleMeta({ atmosphere: 'luxury', sector: 'hotel' }), 'Hotel X');
    expect(new Set(list.map((p) => p.presetId)).size).toBe(3);
    list.forEach((p) => expect(p.rationale.length).toBeGreaterThan(40));
  });
});

describe('schema v2 migration', () => {
  it('opens a version 1 project file and fills the new fields', () => {
    const v2 = sampleProject();
    const v1 = structuredClone(v2) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    v1.schemaVersion = 1;
    for (const k of ['sector', 'location', 'atmosphere', 'goal', 'languages', 'references', 'siteUrl']) delete v1.meta[k];
    delete v1.theme.interactions;
    for (const s of v1.pages[0].sections) { delete s.content.formKind; delete s.content.formEndpoint; }
    const loaded = new ProjectStore(memoryStore()).parse(JSON.stringify(v1));
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded.meta).toMatchObject({ sector: 'other', goal: 'information', languages: ['en'], siteUrl: '' });
    expect(loaded.theme.interactions).toEqual({ magneticButtons: false, cardHover: true });
    expect(loaded.pages[0].sections[0].content.formEndpoint).toBe('');
  });
});

describe('updateMeta command', () => {
  it('keeps the primary language first and validates the site address', () => {
    const p = sampleProject();
    const ok = applyCommand(p, { kind: 'updateMeta', patch: { language: 'fr', languages: ['en', 'fr'] } }, ids);
    expect(ok.ok && ok.project.meta.languages).toEqual(['fr', 'en']);
    const bad = applyCommand(p, { kind: 'updateMeta', patch: { siteUrl: 'http://insecure.example' } }, ids);
    expect(bad.ok).toBe(false);
  });
});

describe('forms', () => {
  it('renders an honest, unconnected form when no endpoint is set', () => {
    const html = render();
    expect(html).toContain('data-dw-form="booking"');
    expect(html).toContain('This form is not connected yet');
    expect(html).not.toMatch(/<form[^>]*action=/);
    expect(html).toContain('type="date"');
    expect(html).toMatch(/<label for="sec_[a-z0-9]+-email">Email<\/label>/);
  });

  it('posts only to https endpoints', () => {
    expect(safeEndpoint('https://formspree.io/f/abc')).toBe('https://formspree.io/f/abc');
    expect(safeEndpoint('http://example.com')).toBeNull();
    expect(safeEndpoint('javascript:alert(1)')).toBeNull();
    const p = sampleProject();
    const contact = p.pages[0].sections.find((s) => s.type === 'contact')!;
    const r = applyCommand(p, { kind: 'updateContent', pageId: p.pages[0].id, sectionId: contact.id, patch: { formEndpoint: 'https://formspree.io/f/abc' } }, ids);
    if (!r.ok) throw new Error(r.error);
    const html = render(r.project);
    expect(html).toContain('action="https://formspree.io/f/abc" method="post"');
    expect(html).toContain('not a confirmed booking');
    expect(html).not.toContain('not connected yet');
  });
});

describe('anchors', () => {
  it('gives every section a unique id and keeps #contact on the contact section', () => {
    const p = sampleProject();
    const page = p.pages[0];
    const dup = applyCommand(p, { kind: 'duplicateSection', pageId: page.id, sectionId: page.sections.find((s) => s.type === 'gallery')!.id }, ids);
    if (!dup.ok) throw new Error(dup.error);
    const sections = dup.project.pages[0].sections;
    const anchors = sections.map((_, i) => anchorFor(sections, i));
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(anchors).toContain('gallery-2');
    expect(anchors[sections.findIndex((s) => s.type === 'contact')]).toBe('contact');
  });
});

describe('SEO', () => {
  it('emits Open Graph and JSON-LD from real facts only', () => {
    const p = sampleProject('', 2, { location: 'Krabi', siteUrl: 'https://andaman.example' });
    const head = headTags(p, p.pages[0]);
    expect(head).toContain('<link rel="canonical" href="https://andaman.example/">');
    expect(head).toContain('<meta property="og:title" content="Andaman Charters">');
    const data = structuredData(p, p.pages[0]);
    expect(data).toEqual({
      '@context': 'https://schema.org', '@type': 'TravelAgency', name: 'Andaman Charters',
      url: 'https://andaman.example/', description: 'Booking requests',
      address: { '@type': 'PostalAddress', addressLocality: 'Krabi' },
    });
    expect(JSON.stringify(data)).not.toMatch(/\[/);
  });

  it('omits canonical and url without a site address and skips placeholder text', () => {
    const p = sampleProject('', 2, { objective: '[Objective]' });
    const head = headTags(p, p.pages[0]);
    expect(head).not.toContain('canonical');
    expect(structuredData(p, p.pages[0])).not.toHaveProperty('description');
    expect(buildSitemap(p)).toBeNull();
    expect(buildRobots(p)).toBe('User-agent: *\nAllow: /\n');
  });

  it('builds a sitemap and robots.txt when the address is known', () => {
    const p = sampleProject('', 2, { siteUrl: 'https://andaman.example/' });
    expect(buildSitemap(p)).toContain('<loc>https://andaman.example/</loc><lastmod>2026-11-07</lastmod>');
    expect(buildRobots(p)).toContain('Sitemap: https://andaman.example/sitemap.xml');
  });

  it('escapes JSON-LD so it cannot close the script tag', () => {
    const p = { ...sampleProject(), name: '</script><script>alert(1)</script>' };
    expect(headTags(p, p.pages[0])).not.toContain('</script><script>alert');
  });
});

describe('master prompt', () => {
  it('fills the brief and keeps the honesty and command rules', () => {
    const text = buildMasterPrompt(sampleProject('', 2, { location: 'Krabi' }));
    expect(text).toContain('- Business name: Andaman Charters');
    expect(text).toContain('- Location: Krabi');
    expect(text).toContain('Never invent availability, booking confirmations');
    expect(text).toContain('Do not write HTML');
  });
});
