import { z } from 'zod';

/**
 * The structured website model. This is the single source of truth for a
 * Dynaweb project: the editor edits it, the renderer turns it into HTML,
 * and (later) the AI assistant proposes changes to it. Generated HTML is
 * always derived, never stored.
 */

export const SCHEMA_VERSION = 3;

const idSchema = z.string().regex(/^[a-z]+_[a-z0-9]+$/, 'invalid id');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb');

// ---------- Animations ----------

export const easingSchema = z.enum(['linear', 'ease', 'ease-out', 'ease-in-out', 'expo-out', 'back-out']);

export const parallaxLayerSchema = z.object({
  id: idSchema,
  role: z.enum(['background', 'midground', 'foreground']),
  imageUrl: z.string().max(2000),
  speed: z.number().min(-1).max(1),
  opacity: z.number().min(0).max(1),
});

export const parallaxSettingsSchema = z.object({
  speed: z.number().min(-1).max(1),
  depth: z.number().min(0).max(1),
  direction: z.enum(['vertical', 'horizontal', 'both']),
  mouseInteraction: z.boolean(),
  mouseStrength: z.number().min(0).max(1),
  scale: z.number().min(1).max(1.5),
  perspective: z.number().min(0).max(3000),
  layers: z.array(parallaxLayerSchema).max(6),
});

export const revealEffectSchema = z.enum([
  'fade-in', 'fade-out', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'zoom-in', 'zoom-out', 'blur', 'rotate', 'scale', 'clip',
]);

export const revealSettingsSchema = z.object({
  effect: revealEffectSchema,
  target: z.enum(['section', 'children', 'headings', 'images', 'buttons', 'cards']),
  duration: z.number().int().min(100).max(4000),
  delay: z.number().int().min(0).max(4000),
  easing: easingSchema,
  distance: z.number().min(0).max(400),
  stagger: z.number().int().min(0).max(1000),
  threshold: z.number().min(0).max(1),
  initialOpacity: z.number().min(0).max(1),
  initialScale: z.number().min(0.5).max(1.5),
  rotation: z.number().min(-180).max(180),
  once: z.boolean(),
});

export const horizontalSettingsSchema = z.object({
  panelWidth: z.number().min(30).max(100), // vw per panel
  gap: z.number().min(0).max(200),
  speed: z.number().min(0.25).max(3),
  direction: z.enum(['ltr', 'rtl']),
  snap: z.boolean(),
  showProgress: z.boolean(),
  showIndicators: z.boolean(),
  mobileLayout: z.enum(['vertical', 'swipe']),
});

export const animationSchema = z.discriminatedUnion('type', [
  z.object({ id: idSchema, type: z.literal('parallax'), enabled: z.boolean(), settings: parallaxSettingsSchema }),
  z.object({ id: idSchema, type: z.literal('reveal'), enabled: z.boolean(), settings: revealSettingsSchema }),
  z.object({ id: idSchema, type: z.literal('horizontal'), enabled: z.boolean(), settings: horizontalSettingsSchema }),
]);

// ---------- Sections ----------

export const SECTION_TYPES = [
  'navigation', 'hero', 'about', 'statistics', 'features', 'services', 'showcase', 'gallery', 'team', 'testimonials',
  'pricing', 'cta', 'contact', 'footer',
] as const;
export const sectionTypeSchema = z.enum(SECTION_TYPES);

const itemSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  text: z.string().max(2000),
  imageUrl: z.string().max(2000),
});

const linkSchema = z.object({ label: z.string().max(80), href: z.string().max(500) });

export const sectionContentSchema = z.object({
  heading: z.string().max(300),
  subheading: z.string().max(1000),
  body: z.string().max(5000),
  imageUrl: z.string().max(2000),
  primaryAction: linkSchema,
  secondaryAction: linkSchema,
  items: z.array(itemSchema).max(24),
  /** Contact / booking form. An empty endpoint means "not connected": the form says so instead of faking success. */
  formKind: z.enum(['inquiry', 'booking']),
  formEndpoint: z.string().max(500),
});

export const sectionStyleSchema = z.object({
  paddingY: z.number().int().min(0).max(320),
  minHeight: z.number().int().min(0).max(100), // vh
  align: z.enum(['start', 'center', 'end']),
  maxWidth: z.number().int().min(480).max(1600),
  background: z.enum(['bg', 'surface', 'accent', 'text']),
  columns: z.number().int().min(1).max(4),
  hidden: z.object({ desktop: z.boolean(), tablet: z.boolean(), mobile: z.boolean() }),
  /** Layout variant; which ones are allowed depends on the section type (SECTION_VARIANTS). */
  variant: z.string().regex(/^[a-z-]{1,24}$/),
});

/**
 * Layout variants per section type. The first one is the default. Two sites
 * with the same sections look different because presets pick different
 * variants, and the owner can switch any of them in the Style tab.
 */
export const SECTION_VARIANTS = {
  navigation: ['standard', 'centered'],
  hero: ['standard', 'split', 'fullbleed', 'editorial'],
  about: ['standard', 'reversed', 'editorial'],
  features: ['standard', 'list', 'asymmetric'],
  services: ['standard', 'list', 'asymmetric'],
  statistics: ['standard', 'band'],
  showcase: ['standard', 'grid'],
  team: ['standard', 'list'],
  gallery: ['standard', 'masonry', 'filmstrip'],
  testimonials: ['standard', 'spotlight'],
  pricing: ['standard', 'list'],
  cta: ['standard', 'split'],
  contact: ['standard', 'centered'],
  footer: ['standard', 'stacked'],
} as const satisfies Record<(typeof SECTION_TYPES)[number], readonly [string, ...string[]]>;

export const VARIANT_LABELS: Record<string, string> = {
  standard: 'Standard', centered: 'Centred', split: 'Split with image', fullbleed: 'Full-bleed image',
  editorial: 'Editorial', reversed: 'Image first', list: 'Numbered list', asymmetric: 'Featured first',
  masonry: 'Masonry', band: 'Accent band', grid: 'Product grid', filmstrip: 'Filmstrip', spotlight: 'Spotlight quote', stacked: 'Stacked',
};

export const sectionSchema = z.object({
  id: idSchema,
  type: sectionTypeSchema,
  name: z.string().min(1).max(80),
  content: sectionContentSchema,
  style: sectionStyleSchema,
  animations: z.array(animationSchema).max(3),
}).refine((s) => (SECTION_VARIANTS[s.type] as readonly string[]).includes(s.style.variant), {
  message: 'layout variant is not available for this section type',
  path: ['style', 'variant'],
});

// ---------- Theme ----------

export const themeSchema = z.object({
  presetId: z.string().max(40),
  name: z.string().max(60),
  fonts: z.object({
    display: z.string().max(80),
    body: z.string().max(80),
    displayWeight: z.number().int().min(100).max(900),
    googleFontsHref: z.string().max(500),
  }),
  colors: z.object({
    bg: hexColor,
    surface: hexColor,
    text: hexColor,
    muted: hexColor,
    accent: hexColor,
    accentText: hexColor,
  }),
  radius: z.number().int().min(0).max(40),
  scale: z.number().min(1.1).max(1.6), // type scale ratio
  motion: z.enum(['none', 'subtle', 'expressive']),
  interactions: z.object({ magneticButtons: z.boolean(), cardHover: z.boolean() }),
});

// ---------- Project ----------

export const SECTORS = ['tourism', 'hotel', 'restaurant', 'other'] as const;
export const ATMOSPHERES = ['minimalist', 'luxury', 'modern', 'natural', 'editorial', 'other'] as const;
export const GOALS = ['bookings', 'sales', 'leads', 'information', 'branding'] as const;
const langCode = z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{2})?$/, 'expected a language code such as en or fr');

export const projectMetaSchema = z.object({
  businessType: z.string().max(120),
  industry: z.string().max(120),
  sector: z.enum(SECTORS),
  location: z.string().max(200),
  atmosphere: z.enum(ATMOSPHERES),
  audience: z.string().max(300),
  goal: z.enum(GOALS),
  objective: z.string().max(500),
  /** Primary language (html lang). */
  language: langCode,
  /** All languages the site should exist in; the first is the primary. Translation arrives with multi-page sites. */
  languages: z.array(langCode).min(1).max(12),
  references: z.string().max(2000),
  brief: z.string().max(4000),
  /** Public site address, used for canonical URL, Open Graph and sitemap. Empty until the owner knows it. */
  siteUrl: z.string().max(300).regex(/^(https:\/\/[^\s]+)?$/, 'expected an https:// address or nothing'),
});

export const pageSchema = z.object({
  id: idSchema,
  slug: z.string().regex(/^[a-z0-9-]*$/),
  title: z.string().min(1).max(120),
  sections: z.array(sectionSchema).max(60),
});

export const projectSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: idSchema,
  name: z.string().min(1).max(120),
  owner: z.string().min(1).max(120),
  meta: projectMetaSchema,
  theme: themeSchema,
  pages: z.array(pageSchema).min(1).max(30),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Easing = z.infer<typeof easingSchema>;
export type ParallaxLayer = z.infer<typeof parallaxLayerSchema>;
export type ParallaxSettings = z.infer<typeof parallaxSettingsSchema>;
export type RevealSettings = z.infer<typeof revealSettingsSchema>;
export type RevealEffect = z.infer<typeof revealEffectSchema>;
export type HorizontalSettings = z.infer<typeof horizontalSettingsSchema>;
export type Animation = z.infer<typeof animationSchema>;
export type AnimationType = Animation['type'];
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type SectionContent = z.infer<typeof sectionContentSchema>;
export type SectionStyle = z.infer<typeof sectionStyleSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Sector = (typeof SECTORS)[number];
export type Atmosphere = (typeof ATMOSPHERES)[number];
export type Goal = (typeof GOALS)[number];
export type ProjectMeta = z.infer<typeof projectMetaSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Project = z.infer<typeof projectSchema>;

export function validateProject(input: unknown): { ok: true; project: Project } | { ok: false; errors: string[] } {
  const result = projectSchema.safeParse(input);
  if (result.success) return { ok: true, project: result.data };
  return { ok: false, errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
