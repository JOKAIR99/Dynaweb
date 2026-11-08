import { SCHEMA_VERSION } from '../model/schema';
import type { Animation, Project, ProjectMeta, Section, SectionType, Theme } from '../model/schema';
import { SECTION_LABELS, createAnimation, createSection, ph } from '../model/defaults';
import type { IdGenerator } from '../model/ids';
import { getPreset } from './presets';

export interface GenerateInput {
  name: string;
  owner: string;
  meta: ProjectMeta;
  presetId: string;
  /** 0 = no motion, 1 = subtle, 2 = expressive */
  motionIntensity: 0 | 1 | 2;
  /** The owner's own structure. When given it replaces the planner's suggestion entirely. */
  sections?: SectionType[];
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

/** Everything the owner wrote, lower-cased: the planner reacts to their words, never to an industry. */
const ownWords = (meta: ProjectMeta) =>
  [meta.purpose, meta.description, meta.activity, meta.brief, meta.features, meta.layout, meta.imagery, meta.motion].join(' ').toLowerCase();

/**
 * A suggested structure, from the main objective and the owner's own words.
 * Dynaweb is universal: no section is added because of an industry. The
 * suggestion is only a starting point; the wizard lets the owner tick and
 * untick every section, and the editor can add, remove and reorder anything.
 */
export function planSections(meta: ProjectMeta): SectionType[] {
  const said = ownWords(meta);
  const g = meta.goal;
  const plan: SectionType[] = ['navigation', 'hero', 'about'];
  if (has(said, 'figures', 'numbers', 'statistics', 'stats', 'key facts', 'metrics')) plan.push('statistics');
  if (g === 'sales' || has(said, 'shop', 'store', 'catalog', 'catalogue', 'products')) plan.push('showcase');
  else plan.push('features');
  if (has(said, 'article', 'blog', 'essay', 'manifesto', 'long text', 'story')) plan.push('text');
  if (g === 'portfolio' || has(said, 'gallery', 'portfolio', 'photo', 'images', 'work samples')) plan.push('gallery');
  if (has(said, 'video', 'film', 'showreel', 'trailer')) plan.push('media');
  if (has(said, 'team', 'founder', 'staff', 'people', 'members', 'speakers')) plan.push('team');
  if (g === 'bookings' || g === 'sales' || g === 'leads' || has(said, 'testimonial', 'review')) plan.push('testimonials');
  if (g === 'sales' || g === 'bookings' || has(said, 'price', 'pricing', 'plans', 'tickets')) plan.push('pricing');
  if (g !== 'information') plan.push('cta');
  if (g !== 'information' || has(said, 'contact', 'form', 'enquir', 'inquir')) plan.push('contact');
  plan.push('footer');
  return plan;
}

function withContent(section: Section, patch: Partial<Section['content']>): Section {
  return { ...section, content: { ...section.content, ...patch } };
}

function animationsFor(type: SectionType, meta: ProjectMeta, motion: 0 | 1 | 2, ids: IdGenerator): Animation[] {
  if (motion === 0) return [];
  const said = ownWords(meta);
  const depthy = meta.atmosphere === 'luxury' || meta.atmosphere === 'natural' || has(said, 'parallax', 'cinematic', 'depth', 'immersive', '3d');
  const sideways = has(said, 'horizontal', 'carousel', 'side-scroll', 'sideways', 'storytelling');

  if (type === 'hero') return depthy ? [createAnimation('parallax', ids)] : [];
  if (type === 'gallery') return sideways ? [createAnimation('horizontal', ids)] : [revealFor(meta, motion, ids, 'cards')];
  if (['about', 'statistics', 'services', 'features', 'showcase', 'team', 'testimonials', 'pricing', 'cta', 'contact', 'text', 'media', 'custom'].includes(type)) {
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
    playful: { effect: 'zoom-in', distance: 24, duration: 650, easing: 'back-out' },
    technical: { effect: 'slide-left', distance: 24, duration: 500, easing: 'ease-out' },
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
 * and theme from the brief. The real name and location are used where known;
 * everything else is a [placeholder], never an invented fact.
 * Phase 5 adds an AI that refines this draft through Commands.
 */
export function generateProject(input: GenerateInput, ids: IdGenerator, now: string): Project {
  const { meta, name } = input;
  const bookings = meta.goal === 'bookings';

  const plan = input.sections?.length ? input.sections : planSections(meta);
  const linkable = plan.filter((t) => !['navigation', 'hero', 'footer', 'cta'].includes(t)).slice(-3);

  const sections: Section[] = plan.map((type) => {
    let section = createSection(type, ids);
    switch (type) {
      case 'navigation':
        section = withContent(section, {
          heading: name,
          // Links point at sections this site actually has.
          items: linkable.map((t) => ({ id: ids('item'), title: t === 'contact' && bookings ? 'Book' : SECTION_LABELS[t], text: `#${t}`, imageUrl: '' })),
        });
        break;
      case 'hero':
        section = withContent(section, {
          primaryAction: { label: bookings ? ph('Book now') : ph('Primary action'), href: '#contact' },
          subheading: ph(`One sentence: what this is${meta.location ? ` (${meta.location})` : ''} and who it is for`),
        });
        break;
      case 'features':
        section = withContent(section, { heading: ph('Key points') });
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
