import type { Theme } from '../model/schema';

/**
 * Dynaweb's own design presets. Each is a complete visual identity
 * (type pairing, palette, radius, type scale, motion intensity), chosen to be
 * far apart from one another so two projects never converge on one look.
 * Inspired by Hallmark's "a theme is a material, not a layout" principle.
 */
const gf = (families: string) => `https://fonts.googleapis.com/css2?${families}&display=swap`;

export const PRESETS: Theme[] = [
  {
    presetId: 'lagoon', name: 'Lagoon',
    fonts: { display: 'Fraunces', body: 'Instrument Sans', displayWeight: 500, googleFontsHref: gf('family=Fraunces:opsz,wght@9..144,500&family=Instrument+Sans:wght@400;600') },
    colors: { bg: '#F4F1EA', surface: '#E3EDE8', text: '#10292B', muted: '#4B6264', accent: '#0F6E6A', accentText: '#F4F1EA' },
    radius: 18, scale: 1.333, motion: 'expressive', interactions: { magneticButtons: true, cardHover: true },
  },
  {
    presetId: 'ledger', name: 'Ledger',
    fonts: { display: 'Newsreader', body: 'IBM Plex Sans', displayWeight: 600, googleFontsHref: gf('family=Newsreader:opsz,wght@6..72,600&family=IBM+Plex+Sans:wght@400;600') },
    colors: { bg: '#FBFAF7', surface: '#EFEBE3', text: '#1C1B19', muted: '#5D5A53', accent: '#8A2D1C', accentText: '#FBFAF7' },
    radius: 2, scale: 1.25, motion: 'subtle', interactions: { magneticButtons: false, cardHover: false },
  },
  {
    presetId: 'nocturne', name: 'Nocturne',
    fonts: { display: 'Syne', body: 'Manrope', displayWeight: 700, googleFontsHref: gf('family=Syne:wght@700&family=Manrope:wght@400;600') },
    colors: { bg: '#0E0F13', surface: '#1A1C23', text: '#ECEAE4', muted: '#A09D95', accent: '#E8B04A', accentText: '#0E0F13' },
    radius: 6, scale: 1.414, motion: 'expressive', interactions: { magneticButtons: true, cardHover: true },
  },
  {
    presetId: 'kiosk', name: 'Kiosk',
    fonts: { display: 'Bricolage Grotesque', body: 'Figtree', displayWeight: 800, googleFontsHref: gf('family=Bricolage+Grotesque:wght@800&family=Figtree:wght@400;600') },
    colors: { bg: '#FFF8EC', surface: '#FFE7C2', text: '#1F1300', muted: '#6B5434', accent: '#D7462B', accentText: '#FFF8EC' },
    radius: 28, scale: 1.3, motion: 'subtle', interactions: { magneticButtons: false, cardHover: true },
  },
  {
    presetId: 'quarry', name: 'Quarry',
    fonts: { display: 'Inter Tight', body: 'Inter', displayWeight: 600, googleFontsHref: gf('family=Inter+Tight:wght@600&family=Inter:wght@400;600') },
    colors: { bg: '#F7F7F5', surface: '#EAEAE6', text: '#161616', muted: '#5E5E5A', accent: '#2F4BFF', accentText: '#F7F7F5' },
    radius: 0, scale: 1.5, motion: 'subtle', interactions: { magneticButtons: false, cardHover: false },
  },
  {
    presetId: 'canopy', name: 'Canopy',
    fonts: { display: 'Cormorant Garamond', body: 'Karla', displayWeight: 600, googleFontsHref: gf('family=Cormorant+Garamond:wght@600&family=Karla:wght@400;600') },
    colors: { bg: '#EEF0E6', surface: '#DCE3CF', text: '#1F2A1C', muted: '#56614F', accent: '#8B4A2B', accentText: '#EEF0E6' },
    radius: 10, scale: 1.333, motion: 'expressive', interactions: { magneticButtons: false, cardHover: true },
  },
];

export function getPreset(id: string): Theme {
  const preset = PRESETS.find((p) => p.presetId === id) ?? PRESETS[0];
  return structuredClone(preset);
}
