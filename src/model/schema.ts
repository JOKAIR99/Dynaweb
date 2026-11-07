import { z } from 'zod';

/**
 * The structured website model. This is the single source of truth for a
 * Dynaweb project: the editor edits it, the renderer turns it into HTML,
 * and (later) the AI assistant proposes changes to it. Generated HTML is
 * always derived, never stored.
 */

export const SCHEMA_VERSION = 1;

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

export const SECTION_TYPES = ['navigation', 'hero', 'about', 'features', 'gallery', 'cta', 'footer'] as const;
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
});

export const sectionStyleSchema = z.object({
  paddingY: z.number().int().min(0).max(320),
  minHeight: z.number().int().min(0).max(100), // vh
  align: z.enum(['start', 'center', 'end']),
  maxWidth: z.number().int().min(480).max(1600),
  background: z.enum(['bg', 'surface', 'accent', 'text']),
  columns: z.number().int().min(1).max(4),
  hidden: z.object({ desktop: z.boolean(), tablet: z.boolean(), mobile: z.boolean() }),
});

export const sectionSchema = z.object({
  id: idSchema,
  type: sectionTypeSchema,
  name: z.string().min(1).max(80),
  content: sectionContentSchema,
  style: sectionStyleSchema,
  animations: z.array(animationSchema).max(3),
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
});

// ---------- Project ----------

export const projectMetaSchema = z.object({
  businessType: z.string().max(120),
  industry: z.string().max(120),
  audience: z.string().max(300),
  language: z.string().min(2).max(12),
  objective: z.string().max(500),
  brief: z.string().max(4000),
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
export type ProjectMeta = z.infer<typeof projectMetaSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Project = z.infer<typeof projectSchema>;

export function validateProject(input: unknown): { ok: true; project: Project } | { ok: false; errors: string[] } {
  const result = projectSchema.safeParse(input);
  if (result.success) return { ok: true, project: result.data };
  return { ok: false, errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
