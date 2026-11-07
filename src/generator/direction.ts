import type { Atmosphere, ProjectMeta, Sector } from '../model/schema';
import { PRESETS } from './presets';

/**
 * Art direction: turns the brief into a small set of distinct design
 * proposals before anything is generated. Each proposal is a preset plus the
 * reasoning a designer would give for it. Deterministic: the same brief always
 * gives the same proposals, but two businesses with the same sector and
 * atmosphere get a different order, so sites do not converge on one look.
 */
export interface DesignProposal {
  presetId: string;
  name: string;
  rationale: string;
  /** What makes this preset's identity different from the others. */
  character: string;
  layout: string;
  imagery: string;
  spacing: string;
  interaction: string;
  responsive: string;
}

const PRESET_FIT: Record<string, { atmospheres: Atmosphere[]; sectors: Sector[] }> = {
  lagoon: { atmospheres: ['natural', 'luxury', 'modern'], sectors: ['tourism', 'hotel'] },
  ledger: { atmospheres: ['editorial', 'minimalist'], sectors: ['other', 'restaurant'] },
  nocturne: { atmospheres: ['luxury', 'modern'], sectors: ['hotel', 'restaurant'] },
  kiosk: { atmospheres: ['modern', 'other'], sectors: ['restaurant', 'other'] },
  quarry: { atmospheres: ['minimalist', 'modern'], sectors: ['other', 'hotel'] },
  canopy: { atmospheres: ['natural', 'editorial', 'luxury'], sectors: ['tourism', 'restaurant'] },
};

const CHARACTER: Record<string, string> = {
  lagoon: 'Soft rounded surfaces and an optical-size serif: calm, airy, coastal.',
  ledger: 'Square corners, a newspaper serif and ink-red accents: precise and literate.',
  nocturne: 'A dark stage with a gold accent and a wide geometric display face: nightlife, after-hours luxury.',
  kiosk: 'Chunky grotesque headlines, pill buttons and a warm poster palette: friendly and loud.',
  quarry: 'Strict grid, zero radius, one electric accent: architectural and quiet.',
  canopy: 'A high-contrast garamond on sage and clay: botanical, handmade, slow.',
};

const LAYOUT: Record<Atmosphere, string> = {
  minimalist: 'Few sections, generous whitespace, one strong typographic idea per screen; grids stay strict.',
  luxury: 'Slow pacing: full-height hero, wide margins, imagery given room; the call to action stays quiet but always reachable.',
  modern: 'Confident scale contrast, tight grids, asymmetric splits; sections change rhythm instead of repeating.',
  natural: 'Organic pacing, large photography, soft surfaces; content flows like a walk through the place.',
  editorial: 'Magazine logic: strong headlines, a reading measure for text, captions under images, a clear table of contents in the navigation.',
  other: 'Structure follows the main goal: every section answers one visitor question and points to the next step.',
};

const IMAGERY: Record<Sector, string> = {
  tourism: 'Real photographs of the places and experiences, people in context, golden-hour light. No stock clichés.',
  hotel: 'Rooms, details and views photographed in natural light; one hero image that shows the setting.',
  restaurant: 'Close-up dishes, the room at service, the people who cook; warm light, no plated-food clip art.',
  other: 'Photographs of the real product, team or work; diagrams where the subject is abstract.',
};

const SPACING: Record<Atmosphere, string> = {
  minimalist: 'Large section padding (about 140 px desktop, 72 px mobile); 8 px base grid.',
  luxury: 'Very large section padding and margins; content width capped at about 1100 px.',
  modern: 'Medium padding with deliberate tight clusters; 8 px base grid.',
  natural: 'Comfortable padding, images bleeding to the edges between text sections.',
  editorial: 'Text set to a 60 to 70 character measure, tight heading spacing, wide gutters.',
  other: 'Medium padding; 8 px base grid.',
};

const INTERACTION: Record<Atmosphere, string> = {
  minimalist: 'Almost still: fades only, no cursor effects. Motion confirms, never decorates.',
  luxury: 'Slow, weighty easing; subtle parallax depth on the hero; magnetic primary button.',
  modern: 'Snappy reveals with stagger, magnetic buttons, cards that lift on hover.',
  natural: 'Gentle parallax on landscape imagery; one horizontal gallery to tell the story of a place.',
  editorial: 'Headline clip reveals, captions fading in after images; no cursor effects.',
  other: 'Light reveals on content; motion never delays reading.',
};

const GOAL_NOTE: Record<ProjectMeta['goal'], string> = {
  bookings: 'The booking form is reachable from the navigation, the hero and the end of the page.',
  sales: 'Every product block ends on one clear action; pricing is never hidden.',
  leads: 'One short inquiry form, repeated as a call to action after proof sections.',
  information: 'Navigation carries the weight; contact details are always one click away.',
  branding: 'Story first: fewer actions, more atmosphere, a memorable closing statement.',
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function proposeDirections(meta: ProjectMeta, businessName: string, count = 3): DesignProposal[] {
  const seed = hash(`${businessName}|${meta.location}`);
  const scored = PRESETS.map((p, i) => {
    const fit = PRESET_FIT[p.presetId] ?? { atmospheres: [], sectors: [] };
    const score = (fit.atmospheres.includes(meta.atmosphere) ? 2 : 0) + (fit.sectors.includes(meta.sector) ? 1 : 0);
    // Tie-break by a per-business hash so equal briefs for different businesses still differ.
    return { p, score, tie: (seed + i * 2654435761) % 1000 };
  }).sort((a, b) => b.score - a.score || a.tie - b.tie);

  return scored.slice(0, count).map(({ p }) => ({
    presetId: p.presetId,
    name: p.name,
    character: CHARACTER[p.presetId] ?? '',
    rationale: `${p.fonts.display} headlines with ${p.fonts.body} text on a ${describePalette(p.colors.bg)} palette with a ${describeAccent(p.colors.accent)} accent. ${GOAL_NOTE[meta.goal]}`,
    layout: LAYOUT[meta.atmosphere],
    imagery: IMAGERY[meta.sector],
    spacing: SPACING[meta.atmosphere],
    interaction: INTERACTION[meta.atmosphere],
    responsive: 'Mobile is designed, not shrunk: navigation collapses to the essentials, grids become one column, horizontal galleries become a vertical story or a swipe carousel, and cursor effects are turned off on touch screens.',
  }));
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const describePalette = (bg: string) => (luminance(bg) > 0.5 ? 'light' : 'dark');

/** Names an accent colour by hue, so proposals describe colours as a designer would. */
export function describeAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.08) return max > 0.5 ? 'pale grey' : 'charcoal';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const dark = max < 0.6;
  if (h < 15 || h >= 345) return dark ? 'deep red' : 'red';
  if (h < 40) return dark ? 'terracotta' : 'vermilion';
  if (h < 65) return dark ? 'bronze' : 'gold';
  if (h < 160) return dark ? 'forest green' : 'green';
  if (h < 200) return dark ? 'deep teal' : 'aqua';
  if (h < 255) return dark ? 'navy' : 'electric blue';
  if (h < 290) return 'violet';
  return 'magenta';
}
