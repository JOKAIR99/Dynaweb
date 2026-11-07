import { SCHEMA_VERSION } from '../model/schema';
import type { Animation, Project, ProjectMeta, Section, SectionType, Theme } from '../model/schema';
import { createAnimation, createSection, ph } from '../model/defaults';
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

/**
 * Each preset composes pages differently, not just with different colours.
 * Types not listed use the standard layout.
 */
export const PRESET_LAYOUTS: Record<string, Partial<Record<SectionType, string>>> = {
  lagoon: { statistics: 'band', hero: 'fullbleed', services: 'asymmetric', features: 'asymmetric', gallery: 'masonry', cta: 'split' },
  ledger: { team: 'list', hero: 'editorial', about: 'editorial', services: 'list', features: 'list', testimonials: 'spotlight', pricing: 'list', footer: 'stacked' },
  nocturne: { hero: 'fullbleed', about: 'reversed', services: 'list', features: 'list', gallery: 'filmstrip', testimonials: 'spotlight', cta: 'split', contact: 'centered' },
  kiosk: { statistics: 'band', showcase: 'grid', hero: 'split', services: 'asymmetric', features: 'asymmetric', gallery: 'masonry', navigation: 'centered' },
  quarry: { team: 'list', showcase: 'grid', hero: 'split', about: 'reversed', services: 'list', features: 'list', pricing: 'list', contact: 'centered' },
  canopy: { hero: 'editorial', about: 'reversed', gallery: 'masonry', testimonials: 'spotlight', footer: 'stacked' },
};

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));

/**
 * Which sections a site needs, from its sector and main goal. Sections are
 * only included when they serve the business: no pricing on a branding site,
 * no testimonials section unless reviews matter for the decision.
 */
export function planSections(meta: ProjectMeta): SectionType[] {
  const brief = meta.brief.toLowerCase();
  const plan: SectionType[] = ['navigation', 'hero', 'about'];
  // Figures only when the brief asks for them or proof drives leads; values stay placeholders.
  if (has(brief, 'figures', 'numbers', 'statistics', 'stats', 'key facts') || (meta.goal === 'leads' && meta.sector === 'other')) plan.push('statistics');
  const offer: SectionType = meta.goal === 'sales' ? 'showcase' : meta.sector === 'other' ? 'features' : 'services';
  plan.push(offer);
  if (meta.sector !== 'other' || has(brief, 'gallery', 'portfolio', 'photo')) plan.push('gallery');
  if (has(brief, 'team', 'chef', 'guide', 'crew', 'founder', 'staff', 'people')) plan.push('team');
  const reviewsMatter = meta.goal === 'bookings' || meta.goal === 'sales' || meta.goal === 'leads';
  if (reviewsMatter) plan.push('testimonials');
  if (meta.goal === 'sales' || (meta.goal === 'bookings' && meta.sector !== 'restaurant')) plan.push('pricing');
  if (meta.goal !== 'information') plan.push('cta');
  plan.push('contact', 'footer');
  return plan;
}

const OFFER_HEADING: Record<ProjectMeta['sector'], string> = {
  tourism: 'Experiences you offer',
  hotel: 'Rooms and amenities',
  restaurant: 'Menu highlights',
  other: 'What you offer',
};

function withContent(section: Section, patch: Partial<Section['content']>): Section {
  return { ...section, content: { ...section.content, ...patch } };
}

function animationsFor(type: SectionType, meta: ProjectMeta, motion: 0 | 1 | 2, ids: IdGenerator): Animation[] {
  if (motion === 0) return [];
  const brief = `${meta.brief} ${meta.objective}`.toLowerCase();
  const depthy = meta.atmosphere === 'luxury' || meta.atmosphere === 'natural' || has(brief, 'parallax', 'cinematic', 'depth', 'immersive');
  const sideways = has(brief, 'horizontal', 'carousel', 'portfolio', 'story') || (meta.sector === 'tourism' && motion === 2);

  if (type === 'hero') return depthy ? [createAnimation('parallax', ids)] : [];
  if (type === 'gallery') return sideways ? [createAnimation('horizontal', ids)] : [revealFor(meta, motion, ids, 'cards')];
  if (['about', 'statistics', 'services', 'features', 'showcase', 'team', 'testimonials', 'pricing', 'cta', 'contact'].includes(type)) {
    return [revealFor(meta, motion, ids, type === 'about' || type === 'cta' ? 'children' : 'cards')];
  }
  return [];
}

function revealFor(meta: ProjectMeta, motion: 1 | 2, ids: IdGenerator, target: 'children' | 'cards'): Animation {
  const anim = createAnimation('reveal', ids);
  if (anim.type !== 'reveal') return anim;
  const byAtmosphere = {
    minimalist: { effect: 'fade-in', distance: 0, duration: 600, easing: 'ease-out' },
    luxury: { effect: 'slide-up', distance: 24, duration: 1100, easing: 'expo-out' },
    modern: { effect: 'slide-up', distance: 40, duration: 700, easing: 'back-out' },
    natural: { effect: 'blur', distance: 16, duration: 900, easing: 'expo-out' },
    editorial: { effect: 'clip', distance: 0, duration: 900, easing: 'expo-out' },
    other: { effect: 'slide-up', distance: 32, duration: 700, easing: 'expo-out' },
  } as const;
  const pick = byAtmosphere[meta.atmosphere];
  const subtle = motion === 1 ? { effect: 'fade-in' as const, distance: 12, duration: 500 } : {};
  return { ...anim, settings: { ...anim.settings, ...pick, ...subtle, target } };
}

function themeFor(input: GenerateInput): Theme {
  const theme = getPreset(input.presetId);
  const motion = (['none', 'subtle', 'expressive'] as const)[input.motionIntensity];
  const magnetic = input.motionIntensity === 2 && (input.meta.atmosphere === 'luxury' || input.meta.atmosphere === 'modern');
  return {
    ...theme,
    motion,
    interactions: { magneticButtons: magnetic || (theme.interactions.magneticButtons && input.motionIntensity === 2), cardHover: theme.interactions.cardHover && input.motionIntensity > 0 },
  };
}

/**
 * Deterministic generator. Builds structure, content placeholders, animation
 * and theme from the brief. The real business name and location are used where
 * known; everything else is a [placeholder], never an invented fact.
 * Phase 5 adds an AI that refines this draft through Commands.
 */
export function generateProject(input: GenerateInput, ids: IdGenerator, now: string): Project {
  const { meta, name } = input;
  const bookings = meta.goal === 'bookings';

  const sections: Section[] = planSections(meta).map((type) => {
    let section = createSection(type, ids);
    switch (type) {
      case 'navigation':
        section = withContent(section, {
          heading: name,
          items: section.content.items.map((it, i) => (i === 2 ? { ...it, title: bookings ? 'Book' : 'Contact' } : it)),
        });
        break;
      case 'hero':
        section = withContent(section, {
          primaryAction: { label: bookings ? ph('Book now') : ph('Primary action'), href: '#contact' },
          subheading: meta.location ? ph(`One sentence: what you offer in ${meta.location}, and for whom`) : section.content.subheading,
        });
        break;
      case 'services':
      case 'features':
        section = withContent(section, { heading: ph(OFFER_HEADING[meta.sector]) });
        break;
      case 'cta':
        section = withContent(section, { primaryAction: { label: bookings ? ph('Check availability') : ph('Get in touch'), href: '#contact' } });
        break;
      case 'contact':
        section = withContent(section, {
          formKind: bookings ? 'booking' : 'inquiry',
          body: meta.location ? `${meta.location}. ${ph('Street address, phone, email')}` : section.content.body,
        });
        break;
      case 'footer':
        section = withContent(section, { heading: name, body: meta.location ? `${meta.location}. ${ph('Contact details')}` : section.content.body });
        break;
    }
    const variant = PRESET_LAYOUTS[input.presetId]?.[type] ?? 'standard';
    return { ...section, style: { ...section.style, variant }, animations: animationsFor(type, meta, input.motionIntensity, ids) };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    id: ids('proj'),
    name,
    owner: input.owner,
    meta,
    theme: themeFor(input),
    pages: [{ id: ids('page'), slug: '', title: 'Home', sections }],
    createdAt: now,
    updatedAt: now,
  };
}
