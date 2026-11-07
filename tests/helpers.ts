import { generateProject } from '../src/generator/generate';
import { createSequentialIds } from '../src/model/ids';
import type { Project } from '../src/model/schema';

export const NOW = '2026-11-07T10:00:00.000Z';

export function sampleProject(brief = 'cinematic parallax hero and a horizontal gallery', motion: 0 | 1 | 2 = 2): Project {
  return generateProject({
    name: 'Andaman Charters', owner: 'test',
    meta: { businessType: 'Boat tours', industry: 'Tourism', audience: 'Travellers', language: 'en', objective: 'Booking requests', brief },
    presetId: 'lagoon', motionIntensity: motion,
  }, createSequentialIds(), NOW);
}
