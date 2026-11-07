import { generateProject } from '../src/generator/generate';
import { createSequentialIds } from '../src/model/ids';
import type { Project, ProjectMeta } from '../src/model/schema';

export const NOW = '2026-11-07T10:00:00.000Z';

export function sampleMeta(overrides: Partial<ProjectMeta> = {}): ProjectMeta {
  return {
    businessType: 'Boat tours', industry: 'Tourism', sector: 'tourism', location: '', atmosphere: 'natural',
    audience: 'Travellers', goal: 'bookings', objective: 'Booking requests', language: 'en', languages: ['en'],
    references: '', brief: 'cinematic parallax hero and a horizontal gallery', siteUrl: '',
    ...overrides,
  };
}

export function sampleProject(brief = 'cinematic parallax hero and a horizontal gallery', motion: 0 | 1 | 2 = 2, meta: Partial<ProjectMeta> = {}): Project {
  return generateProject({
    name: 'Andaman Charters', owner: 'test',
    meta: sampleMeta({ brief, ...meta }),
    presetId: 'lagoon', motionIntensity: motion,
  }, createSequentialIds(), NOW);
}
