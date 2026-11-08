import { describe, expect, it } from 'vitest';
import { AREAS, getArea } from '../src/generator/areas';
import { generateProject } from '../src/generator/generate';
import { createSequentialIds } from '../src/model/ids';
import { GOALS, ATMOSPHERES, SECTION_TYPES, validateProject } from '../src/model/schema';
import { structuredData } from '../src/render/seo';
import { NOW, sampleMeta } from './helpers';

function projectFor(areaId: string) {
  const area = getArea(areaId)!;
  return generateProject({
    name: 'Sample', owner: 't', presetId: 'quarry', motionIntensity: 1, sections: area.sections, headings: area.headings,
    meta: sampleMeta({ activity: area.activity, goal: area.goal, atmosphere: area.atmosphere, schemaType: area.schemaType }),
  }, createSequentialIds(), NOW);
}

describe('area starting points', () => {
  it('cover the areas the owner asked for, and more', () => {
    const ids = AREAS.map((a) => a.id);
    for (const wanted of ['hotel', 'tourism', 'restaurant', 'ai-tech', 'services']) expect(ids).toContain(wanted);
    expect(AREAS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(AREAS.map((a) => [a.id]))('%s is a valid, honest starting point', (id) => {
    const area = getArea(id)!;
    expect(GOALS).toContain(area.goal);
    expect(ATMOSPHERES).toContain(area.atmosphere);
    expect(area.schemaType).toMatch(/^[A-Za-z]{1,60}$/);
    area.sections.forEach((t) => expect(SECTION_TYPES).toContain(t));
    // Headings guide but never state facts: every one is a [placeholder] for a section the area includes.
    for (const [type, heading] of Object.entries(area.headings)) {
      expect(heading).toMatch(/^\[.+\]$/);
      expect(area.sections).toContain(type);
    }
    const p = projectFor(id);
    expect(validateProject(p).ok).toBe(true);
    expect(p.pages[0].sections.map((s) => s.type)).toEqual(area.sections);
    expect(structuredData(p, p.pages[0])['@type']).toBe(area.schemaType);
  });

  it('puts the area headings on the generated sections', () => {
    const hotel = projectFor('hotel');
    expect(hotel.pages[0].sections.find((s) => s.type === 'services')?.content.heading).toBe('[Rooms and amenities]');
    const ai = projectFor('ai-tech');
    expect(ai.pages[0].sections.find((s) => s.type === 'media')?.content.heading).toBe('[Product demo]');
  });

  it('keeps "other" fully generic', () => {
    expect(getArea('')).toBeUndefined();
    const generic = generateProject({ name: 'X', owner: 't', presetId: 'quarry', motionIntensity: 1, meta: sampleMeta({ schemaType: '' }) }, createSequentialIds(), NOW);
    expect(structuredData(generic, generic.pages[0])['@type']).toBe('Organization');
  });
});
