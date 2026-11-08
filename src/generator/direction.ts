import type { Atmosphere, ProjectMeta } from '../model/schema';
import { PRESETS } from './presets';

/**
 * Art direction: turns the brief into a small set of distinct design
 * proposals before anything is generated. Each proposal is a preset plus the
 * reasoning a designer would give for it. Deterministic: the same brief always
 * gives the same proposals, but two projects with the same atmosphere and
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

/** Which atmospheres each preset suits. No industries: a preset is a look, not a business type. */
const PRESET_FIT: Record<string, Atmosphere[]> = {
  lagoon: ['natural', 'luxury', 'modern'],
  ledger: ['editorial', 'minimalist', 'technical'],
  nocturne: ['luxury', 'modern', 'technical'],
  kiosk: ['playful', 'modern'],
  quarry: ['minimalist', 'technical', 'modern'],
  canopy: ['natural', 'editorial', 'luxury'],
};

const CHARACTER: Record<string, string> = {
  lagoon: 'Soft rounded surfaces and an optical-size serif: calm and airy.',
  ledger: 'Square corners, a newspaper serif and ink-red accents: precise and literate.',
  nocturne: 'A dark stage with a gold accent and a wide geometric display face: dramatic, after-hours.',
  kiosk: 'Chunky grotesque headlines, pill buttons and a warm poster palette: friendly and loud.',
  quarry: 'Strict grid, zero radius, one electric accent: architectural and quiet.',
  canopy: 'A high-contrast garamond on sage and clay: organic, handmade, slow.',
};

const LAYOUT: Record<Atmosphere, string> = {
  minimalist: 'Few sections, generous whitespace, one strong typographic idea per screen; grids stay strict.',
  luxury: 'Slow pacing: full-height hero, wide margins, imagery given room; the call to action stays quiet but always reachable.',
  modern: 'Confident scale contrast, tight grids, asymmetric splits; sections change rhythm instead of repeating.',
  natural: 'Organic pacing, large images, soft surfaces; content flows from one section into the next.',
  editorial: 'Magazine logic: strong headlines, a reading measure for text, captions under images, a clear table of contents in the navigation.',
  playful: 'Bold scale jumps, rounded shapes, colour blocks; one surprise per screen, never at the cost of clarity.',
  technical: 'Precise grids, monospaced details, dense but scannable content; diagrams and figures carry the argument.',
  other: 'Structure follows the main objective: every section answers one visitor question and points to the next step.',
};

/** Used only when the owner gave no imagery direction of their own. */
const IMAGERY: Record<Atmosphere, string> = {
  minimalist: 'Few images, each one essential; plenty of negative space around them.',
  luxury: 'Large, quiet photographs with natural light and texture; nothing staged or generic.',
  modern: 'Crisp, high-contrast images and product or interface shots; consistent cropping.',
  natural: 'Real photographs in natural light, people and places in context.',
  editorial: 'Documentary photographs with captions; images that tell part of the story.',
  playful: 'Colourful illustrations or cut-out photographs; expressive, never clip art.',
  technical: 'Diagrams, screenshots and data visualisations before decorative imagery.',
  other: 'Real images of the subject; avoid stock photos that could belong to any site.',
};

const SPACING: Record<Atmosphere, string> = {
  minimalist: 'Large section padding (about 140 px desktop, 72 px mobile); 8 px base grid.',
  luxury: 'Very large section padding and margins; content width capped at about 1100 px.',
  modern: 'Medium padding with deliberate tight clusters; 8 px base grid.',
  natural: 'Comfortable padding, images bleeding to the edges between text sections.',
  editorial: 'Text set to a 60 to 70 character measure, tight heading spacing, wide gutters.',
  playful: 'Varied padding that changes rhythm between sections; generous touch targets.',
  technical: 'Compact, consistent spacing on a 4 px grid; dense tables stay readable.',
  other: 'Medium padding; 8 px base grid.',
};

const INTERACTION: Record<Atmosphere, string> = {
  minimalist: 'Almost still: fades only, no cursor effects. Motion confirms, never decorates.',
  luxury: 'Slow, weighty easing; subtle parallax depth on the hero; magnetic primary button.',
  modern: 'Snappy reveals with stagger, magnetic buttons, cards that lift on hover.',
  natural: 'Gentle parallax on large images; one horizontal sequence to tell a story.',
  editorial: 'Headline clip reveals, captions fading in after images; no cursor effects.',
  playful: 'Bouncy zoom reveals and hover lifts; motion with personality but short durations.',
  technical: 'Fast, linear transitions; motion only where it explains a change of state.',
  other: 'Light reveals on content; motion never delays reading.',
};

const GOAL_NOTE: Record<ProjectMeta['goal'], string> = {
  bookings: 'The booking form is reachable from the navigation, the hero and the end of the page.',
  sales: 'Every product block ends on one clear action; pricing is never hidden.',
  leads: 'One short inquiry form, repeated as a call to action after proof sections.',
  information: 'Navigation carries the weight; key information is never more than one click away.',
  branding: 'Story first: fewer actions, more atmosphere, a memorable closing statement.',
  community: 'Joining is the main action: show who is already here and what members do together.',
  portfolio: 'The work leads: large visuals first, words second, contact at the end.',
  other: 'Each section earns its place by answering one question the visitor has.',
};

/** Colour words the owner may use, mapped to the accent names describeAccent() produces. */
const COLOUR_WORDS: Record<string, string[]> = {
  red: ['red', 'deep red', 'vermilion'], orange: ['vermilion', 'terracotta'], terracotta: ['terracotta'],
  gold: ['gold', 'bronze'], yellow: ['gold'], green: ['green', 'forest green'], teal: ['deep teal', 'aqua'],
  blue: ['electric blue', 'navy', 'aqua'], navy: ['navy'], purple: ['violet'], violet: ['violet'], pink: ['magenta'],
  dark: [], black: [], light: [], white: [],
};

/** Points for a preset that matches the owner's own colour words. */
function colourFit(preset: (typeof PRESETS)[number], wanted: string): number {
  const words = wanted.toLowerCase();
  if (!words.trim()) return 0;
  let score = 0;
  const accent = describeAccent(preset.colors.accent);
  for (const [word, names] of Object.entries(COLOUR_WORDS)) {
    if (!words.includes(word)) continue;
    if (names.includes(accent)) score += 2;
    if ((word === 'dark' || word === 'black') && describePalette(preset.colors.bg) === 'dark') score += 2;
    if ((word === 'light' || word === 'white') && describePalette(preset.colors.bg) === 'light') score += 1;
  }
  return score;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function proposeDirections(meta: ProjectMeta, businessName: string, count = 3): DesignProposal[] {
  const seed = hash(`${businessName}|${meta.location}|${meta.activity}`);
  const scored = PRESETS.map((p, i) => {
    const score = ((PRESET_FIT[p.presetId] ?? []).includes(meta.atmosphere) ? 2 : 0) + colourFit(p, meta.colors);
    // Tie-break by a per-business hash so equal briefs for different businesses still differ.
    return { p, score, tie: hash(`${seed}|${p.presetId}|${i}`) };
  }).sort((a, b) => b.score - a.score || a.tie - b.tie);

  return scored.slice(0, count).map(({ p }) => ({
    presetId: p.presetId,
    name: p.name,
    character: CHARACTER[p.presetId] ?? '',
    rationale: `${p.fonts.display} headlines with ${p.fonts.body} text on a ${describePalette(p.colors.bg)} palette with a ${describeAccent(p.colors.accent)} accent. ${GOAL_NOTE[meta.goal]}`,
    layout: LAYOUT[meta.atmosphere],
    imagery: meta.imagery.trim() || IMAGERY[meta.atmosphere],
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
  if (h < 32) return dark ? 'terracotta' : 'vermilion';
  if (h < 65) return dark ? 'bronze' : 'gold';
  if (h < 160) return dark ? 'forest green' : 'green';
  if (h < 200) return dark ? 'deep teal' : 'aqua';
  if (h < 255) return dark ? 'navy' : 'electric blue';
  if (h < 290) return 'violet';
  return 'magenta';
}
