import type {
  Animation, AnimationType, HorizontalSettings, ParallaxSettings, RevealSettings,
  Section, SectionContent, SectionStyle, SectionType,
} from './schema';
import type { IdGenerator } from './ids';

/** Placeholder marker. Dynaweb never invents business facts; missing info is shown like this. */
export const ph = (what: string): string => `[${what}]`;

export const DEFAULT_PARALLAX: ParallaxSettings = {
  speed: 0.35, depth: 0.6, direction: 'vertical', mouseInteraction: false, mouseStrength: 0.3,
  scale: 1.1, perspective: 0, layers: [],
};

export const DEFAULT_REVEAL: RevealSettings = {
  effect: 'slide-up', target: 'children', duration: 700, delay: 0, easing: 'expo-out',
  distance: 40, stagger: 90, threshold: 0.15, initialOpacity: 0, initialScale: 0.92,
  rotation: 8, once: true,
};

export const DEFAULT_HORIZONTAL: HorizontalSettings = {
  panelWidth: 70, gap: 32, speed: 1, direction: 'ltr', snap: false, showProgress: true,
  showIndicators: true, mobileLayout: 'vertical',
};

export function createAnimation(type: AnimationType, ids: IdGenerator): Animation {
  const id = ids('anim');
  switch (type) {
    case 'parallax': return { id, type, enabled: true, settings: { ...DEFAULT_PARALLAX, layers: [] } };
    case 'reveal': return { id, type, enabled: true, settings: { ...DEFAULT_REVEAL } };
    case 'horizontal': return { id, type, enabled: true, settings: { ...DEFAULT_HORIZONTAL } };
  }
}

const emptyLink = { label: '', href: '' };

function baseContent(): SectionContent {
  return { heading: '', subheading: '', body: '', imageUrl: '', primaryAction: emptyLink, secondaryAction: emptyLink, items: [], formKind: 'inquiry', formEndpoint: '', videoUrl: '' };
}

function baseStyle(): SectionStyle {
  return {
    paddingY: 96, minHeight: 0, align: 'start', maxWidth: 1200, background: 'bg', columns: 3, variant: 'standard',
    hidden: { desktop: false, tablet: false, mobile: false },
  };
}

export const SECTION_LABELS: Record<SectionType, string> = {
  navigation: 'Navigation', hero: 'Hero', about: 'About', features: 'Features',
  services: 'Services', text: 'Text', media: 'Image or video', custom: 'Custom section', statistics: 'Key figures', showcase: 'Product showcase', team: 'Team', gallery: 'Gallery', testimonials: 'Testimonials', pricing: 'Pricing',
  cta: 'Call to action', contact: 'Contact', footer: 'Footer',
};

/** Creates a section of the given type with placeholder content only. */
export function createSection(type: SectionType, ids: IdGenerator): Section {
  const content = baseContent();
  const style = baseStyle();
  const item = (title: string, text: string) => ({ id: ids('item'), title, text, imageUrl: '' });

  switch (type) {
    case 'navigation':
      Object.assign(content, { heading: ph('Business name'), items: [item('About', '#about'), item('Gallery', '#gallery'), item('Contact', '#contact')] });
      Object.assign(style, { paddingY: 20, columns: 1 });
      break;
    case 'hero':
      Object.assign(content, {
        heading: ph('Headline: what you offer, in one line'),
        subheading: ph('One sentence on who it is for and why it matters'),
        primaryAction: { label: ph('Primary action'), href: '#contact' },
      });
      Object.assign(style, { minHeight: 88, align: 'center', paddingY: 120 });
      break;
    case 'about':
      Object.assign(content, { heading: ph('About heading'), body: ph('Your story: who you are, where you work, what makes you different.') });
      Object.assign(style, { columns: 2 });
      break;
    case 'features':
      Object.assign(content, {
        heading: ph('What you offer'),
        items: [item(ph('Offer one'), ph('Short description')), item(ph('Offer two'), ph('Short description')), item(ph('Offer three'), ph('Short description'))],
      });
      break;
    case 'services':
      Object.assign(content, {
        heading: ph('Services heading'),
        items: [1, 2, 3].map((n) => item(ph(`Service ${n}`), ph('What it includes and who it is for'))),
      });
      Object.assign(style, { background: 'surface' });
      break;
    case 'text':
      Object.assign(content, { heading: ph('Heading'), body: ph('Your text. Separate paragraphs with a blank line.') });
      Object.assign(style, { maxWidth: 760, columns: 1 });
      break;
    case 'media':
      Object.assign(content, { heading: '', subheading: ph('Caption') });
      Object.assign(style, { columns: 1 });
      break;
    case 'custom':
      // Everything is available and nothing is assumed: the owner decides what this section is.
      Object.assign(content, { heading: ph('Section heading'), body: ph('Text') });
      Object.assign(style, { columns: 2 });
      break;
    case 'statistics':
      // Never invented: every figure is a placeholder until the owner enters a real, sourced number.
      Object.assign(content, {
        heading: ph('Key figures heading'),
        items: [1, 2, 3].map((n) => item(ph(`Figure ${n}`), ph('What the figure measures'))),
      });
      Object.assign(style, { paddingY: 72 });
      break;
    case 'showcase':
      Object.assign(content, {
        heading: ph('Products heading'),
        items: [1, 2, 3].map((n) => item(ph(`Product ${n}`), ph('Description and price'))),
        primaryAction: { label: ph('Shop or order'), href: ph('shop link') },
      });
      Object.assign(style, { columns: 3 });
      break;
    case 'team':
      Object.assign(content, {
        heading: ph('The people behind it'),
        items: [1, 2, 3].map((n) => item(ph(`Person ${n} name`), ph('Role'))),
      });
      Object.assign(style, { columns: 3, background: 'surface' });
      break;
    case 'testimonials':
      // Never invented: real quotes only, published with the customer's permission.
      Object.assign(content, {
        heading: ph('What people say'),
        subheading: ph('Only publish real reviews, with permission'),
        items: [1, 2].map((n) => item(ph(`Customer ${n} name`), ph('Real quote from a customer'))),
      });
      Object.assign(style, { columns: 2 });
      break;
    case 'pricing':
      Object.assign(content, {
        heading: ph('Prices'),
        items: [1, 2, 3].map((n) => item(ph(`Option ${n}`), ph('Price and what is included'))),
      });
      break;
    case 'contact':
      Object.assign(content, {
        heading: ph('Contact heading'),
        subheading: ph('How and when you reply'),
        body: ph('Address, phone, email'),
        formKind: 'inquiry',
        formEndpoint: '',
      });
      Object.assign(style, { columns: 2 });
      break;
    case 'gallery':
      Object.assign(content, {
        heading: ph('Gallery heading'),
        items: [1, 2, 3, 4, 5].map((n) => item(ph(`Image ${n} caption`), '')),
      });
      Object.assign(style, { background: 'surface' });
      break;
    case 'cta':
      Object.assign(content, {
        heading: ph('Invitation to act'),
        subheading: ph('Contact details or booking information'),
        primaryAction: { label: ph('Book or contact'), href: ph('booking link') },
      });
      Object.assign(style, { background: 'accent', align: 'center' });
      break;
    case 'footer':
      Object.assign(content, { heading: ph('Business name'), body: ph('Address, phone, email'), subheading: ph('Legal notice') });
      Object.assign(style, { paddingY: 48, background: 'text', columns: 2 });
      break;
  }
  return { id: ids('sec'), type, name: SECTION_LABELS[type], content, style, animations: [], elementAnimations: [] };
}
