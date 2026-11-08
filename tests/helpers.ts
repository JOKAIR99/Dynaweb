import { generateProject } from '../src/generator/generate';
import { createSequentialIds } from '../src/model/ids';
import type { Project, ProjectMeta, SectionType } from '../src/model/schema';

export const NOW = '2026-11-07T10:00:00.000Z';

/** A neutral brief: every descriptive field empty unless a test sets it. */
export function sampleMeta(overrides: Partial<ProjectMeta> = {}): ProjectMeta {
  return {
    purpose: '', description: 'Boat tours', activity: 'Boat tours', location: '', atmosphere: 'natural',
    audience: 'Travellers', goal: 'bookings', objective: 'Booking requests', language: 'en', languages: ['en'],
    references: '', colors: '', typography: '', imagery: '', layout: '', motion: '', features: '', technical: '',
    brief: 'cinematic parallax hero and a horizontal gallery', siteUrl: '', schemaType: '',
    ...overrides,
  };
}

/** The structure most tests use, chosen explicitly like an owner ticking sections in the wizard. */
export const SAMPLE_SECTIONS: SectionType[] = ['navigation', 'hero', 'about', 'services', 'gallery', 'testimonials', 'pricing', 'cta', 'contact', 'footer'];

/** `sections: 'planned'` uses the planner's suggestion instead of the fixed sample structure. */
export function sampleProject(
  brief = 'cinematic parallax hero and a horizontal gallery',
  motion: 0 | 1 | 2 = 2,
  meta: Partial<ProjectMeta> = {},
  sections: SectionType[] | 'planned' = SAMPLE_SECTIONS,
): Project {
  return generateProject({
    name: 'Andaman Charters', owner: 'test',
    meta: sampleMeta({ brief, ...meta }),
    presetId: 'lagoon', motionIntensity: motion,
    sections: sections === 'planned' ? undefined : sections,
  }, createSequentialIds(), NOW);
}
