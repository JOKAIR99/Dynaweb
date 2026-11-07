import { SCHEMA_VERSION } from '../model/schema';
import type { Project, ProjectMeta, Section, SectionType } from '../model/schema';
import { createAnimation, createSection } from '../model/defaults';
import type { IdGenerator } from '../model/ids';
import { getPreset } from './presets';

export interface GenerateInput {
  name: string;
  owner: string;
  meta: ProjectMeta;
  presetId: string;
  /** 0 = no motion, 1 = subtle, 2 = expressive */
  motionIntensity: 0 | 1 | 2;
}

const has = (brief: string, ...words: string[]) => words.some((w) => brief.includes(w));

/**
 * Deterministic generator (no AI yet; Phase 5 replaces the brief parsing with
 * an AI that emits Commands). It builds a structure from the brief, puts the
 * real project name where it is known and placeholders everywhere else.
 */
export function generateProject(input: GenerateInput, ids: IdGenerator, now: string): Project {
  const brief = `${input.meta.brief} ${input.meta.objective}`.toLowerCase();
  const wantsParallax = input.motionIntensity > 0 && has(brief, 'parallax', 'cinematic', 'depth', 'immersive');
  const wantsHorizontal = input.motionIntensity > 0 && has(brief, 'horizontal', 'gallery', 'portfolio', 'carousel');

  const order: SectionType[] = ['navigation', 'hero', 'about', 'features', 'gallery', 'cta', 'footer'];
  const sections: Section[] = order.map((type) => {
    let section = createSection(type, ids);
    if (type === 'navigation' || type === 'footer') {
      section = { ...section, content: { ...section.content, heading: input.name } };
    }
    if (type === 'hero' && wantsParallax) {
      const anim = createAnimation('parallax', ids);
      section = { ...section, animations: [anim] };
    }
    if (type === 'gallery' && wantsHorizontal) {
      section = { ...section, animations: [createAnimation('horizontal', ids)] };
    }
    if (input.motionIntensity > 0 && ['about', 'features', 'cta'].includes(type)) {
      const reveal = createAnimation('reveal', ids);
      if (reveal.type === 'reveal' && input.motionIntensity === 1) {
        reveal.settings = { ...reveal.settings, effect: 'fade-in', distance: 16, duration: 500 };
      }
      section = { ...section, animations: [...section.animations, reveal] };
    }
    return section;
  });

  const theme = getPreset(input.presetId);
  theme.motion = (['none', 'subtle', 'expressive'] as const)[input.motionIntensity];

  return {
    schemaVersion: SCHEMA_VERSION,
    id: ids('proj'),
    name: input.name,
    owner: input.owner,
    meta: input.meta,
    theme,
    pages: [{ id: ids('page'), slug: '', title: 'Home', sections }],
    createdAt: now,
    updatedAt: now,
  };
}
