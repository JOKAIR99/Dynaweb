import type { Theme } from '../model/schema';

/** Base stylesheet of a generated site. All colours and fonts come from :root tokens. */
export function siteCss(theme: Theme): string {
  const c = theme.colors;
  const s = theme.scale;
  return `/* Dynaweb Studio generated stylesheet. Design floor adapted from Hallmark (MIT). */
:root {
  --dw-bg: ${c.bg}; --dw-surface: ${c.surface}; --dw-text: ${c.text}; --dw-muted: ${c.muted};
  --dw-accent: ${c.accent}; --dw-accent-text: ${c.accentText};
  --dw-font-display: '${theme.fonts.display}', Georgia, serif;
  --dw-font-body: '${theme.fonts.body}', system-ui, sans-serif;
  --dw-display-weight: ${theme.fonts.displayWeight};
  --dw-radius: ${theme.radius}px;
  --dw-step-0: 1rem; --dw-step-1: ${(s).toFixed(3)}rem; --dw-step-2: ${(s ** 2).toFixed(3)}rem;
  --dw-step-3: ${(s ** 3).toFixed(3)}rem; --dw-step-4: clamp(${(s ** 3).toFixed(2)}rem, 5.5vw, ${(s ** 5).toFixed(2)}rem);
  --dw-gutter: clamp(1rem, 4vw, 2.5rem);
}
*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: clip; margin: 0; }
body { background: var(--dw-bg); color: var(--dw-text); font-family: var(--dw-font-body); font-size: var(--dw-step-0); line-height: 1.6; }
h1, h2, h3 { font-family: var(--dw-font-display); font-weight: var(--dw-display-weight); line-height: 1.08; margin: 0 0 0.5em; overflow-wrap: break-word; min-width: 0; text-wrap: balance; }
h1 { font-size: var(--dw-step-4); } h2 { font-size: var(--dw-step-3); } h3 { font-size: var(--dw-step-1); }
p { margin: 0 0 1em; max-width: 62ch; }
a { color: inherit; }
a:focus-visible, button:focus-visible { outline: 3px solid var(--dw-accent); outline-offset: 3px; }
img { max-width: 100%; display: block; }
.dw-section { position: relative; padding-block: var(--dw-pad, 96px); }
.dw-inner { width: min(100% - 2 * var(--dw-gutter), var(--dw-max, 1200px)); margin-inline: auto; position: relative; z-index: 2; }
.dw-align-center .dw-inner { text-align: center; } .dw-align-center p { margin-inline: auto; }
.dw-align-end .dw-inner { text-align: end; }
.dw-bg-bg { background: var(--dw-bg); } .dw-bg-surface { background: var(--dw-surface); }
.dw-bg-accent { background: var(--dw-accent); color: var(--dw-accent-text); }
.dw-bg-text { background: var(--dw-text); color: var(--dw-bg); }
.dw-bg-accent .dw-muted, .dw-bg-text .dw-muted { color: inherit; opacity: 0.8; }
.dw-muted { color: var(--dw-muted); }
.dw-lead { font-size: var(--dw-step-1); }
.dw-btn { display: inline-block; padding: 0.85em 1.5em; border-radius: var(--dw-radius); background: var(--dw-accent); color: var(--dw-accent-text); text-decoration: none; font-weight: 600; transition: transform 160ms ease-out, opacity 160ms ease-out; }
.dw-btn:hover { transform: translateY(-2px); }
.dw-bg-accent .dw-btn { background: var(--dw-accent-text); color: var(--dw-accent); }
.dw-actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }
.dw-align-center .dw-actions { justify-content: center; }
.dw-grid { display: grid; gap: clamp(1rem, 3vw, 2rem); grid-template-columns: repeat(var(--dw-cols, 3), minmax(0, 1fr)); }
.dw-card { padding: 1.5rem; border-radius: var(--dw-radius); background: var(--dw-surface); }
.dw-bg-surface .dw-card { background: var(--dw-bg); }
.dw-media { aspect-ratio: 4 / 3; border-radius: var(--dw-radius); background: var(--dw-surface); overflow: hidden; display: grid; place-items: center; color: var(--dw-muted); font-size: 0.875rem; }
.dw-media img { width: 100%; height: 100%; object-fit: cover; }
.dw-bg-surface .dw-media { background: var(--dw-bg); }
.dw-nav .dw-inner { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.dw-nav ul { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }
.dw-nav a { text-decoration: none; }
.dw-brand { font-family: var(--dw-font-display); font-weight: var(--dw-display-weight); font-size: var(--dw-step-1); }
.dw-hero { display: grid; align-items: center; overflow: hidden; }
.dw-footer .dw-grid { align-items: end; }
/* Parallax: static layers by default, the runtime moves them. */
.dw-plx-layer { position: absolute; inset: -12% 0; z-index: 0; background-size: cover; background-position: center; pointer-events: none; will-change: transform; }
.dw-plx-placeholder { background: radial-gradient(120% 90% at 20% 10%, var(--dw-surface), transparent 60%), radial-gradient(90% 80% at 90% 100%, var(--dw-accent), transparent 65%); opacity: 0.55; }
/* Horizontal scroll: vertical stack by default (no JS, reduced motion, small screens). */
.dw-h-track { display: grid; gap: var(--dw-h-gap, 32px); grid-template-columns: minmax(0, 1fr); padding-inline: var(--dw-gutter); }
.dw-h-panel figure { margin: 0; }
.dw-h-panel figcaption { margin-top: 0.75rem; }
.dw-h-progress, .dw-h-dots { display: none; }
@media (min-width: 640px) { .dw-h-track { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.dw-h-swipe .dw-h-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; }
.dw-h-swipe .dw-h-panel { flex: 0 0 80%; scroll-snap-align: start; }
html.dw-js .dw-h-active { padding: 0; }
html.dw-js .dw-h-active .dw-h-sticky { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
html.dw-js .dw-h-active .dw-h-track { display: flex; width: max-content; padding-inline: var(--dw-gutter); will-change: transform; }
html.dw-js .dw-h-active .dw-h-panel { width: var(--dw-h-panel, 70vw); flex: 0 0 auto; }
html.dw-js .dw-h-active .dw-h-panel .dw-media { aspect-ratio: auto; height: min(62vh, calc(var(--dw-h-panel, 70vw) * 0.75)); }
html.dw-js .dw-h-active .dw-h-progress { display: block; position: absolute; left: var(--dw-gutter); right: var(--dw-gutter); bottom: 2rem; height: 3px; background: var(--dw-surface); }
html.dw-js .dw-h-active .dw-h-progress span { display: block; height: 100%; width: 100%; background: var(--dw-accent); transform-origin: left; transform: scaleX(var(--dw-h-p, 0)); }
html.dw-js .dw-h-active .dw-h-dots { display: flex; gap: 0.5rem; position: absolute; right: var(--dw-gutter); top: 2rem; }
.dw-h-dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--dw-muted); opacity: 0.4; }
.dw-h-dots i.on { opacity: 1; background: var(--dw-accent); }
/* Reveal: hidden state applies only once the runtime has marked the element. */
.dw-rv { transition-property: opacity, transform, filter, clip-path; transition-duration: var(--dw-rv-dur, 700ms); transition-delay: var(--dw-rv-delay, 0ms); transition-timing-function: var(--dw-rv-ease, ease-out); }
.dw-rv:not(.dw-in) { opacity: var(--dw-rv-o, 0); transform: var(--dw-rv-t, none); filter: var(--dw-rv-f, none); clip-path: var(--dw-rv-c, none); }
.dw-rv.dw-rv-out.dw-in { opacity: 0; }
@media (max-width: 767px) { .dw-grid { grid-template-columns: minmax(0, 1fr); } .dw-hide-mobile { display: none !important; } }
@media (min-width: 768px) and (max-width: 1099px) { .dw-grid { grid-template-columns: repeat(min(var(--dw-cols, 3), 2), minmax(0, 1fr)); } .dw-hide-tablet { display: none !important; } }
@media (min-width: 1100px) { .dw-hide-desktop { display: none !important; } }
@media (prefers-reduced-motion: reduce) {
  .dw-rv { transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; }
  .dw-plx-layer { transform: none !important; }
  .dw-btn { transition: none; }
}
`;
}

export const EDITOR_CSS = `
[data-dw-id] { cursor: pointer; }
[data-dw-id]:hover { outline: 2px dashed rgba(64, 120, 255, 0.6); outline-offset: -2px; }
[data-dw-id].dw-selected { outline: 2px solid #3d6bff; outline-offset: -2px; }
[data-dw-id].dw-selected::after { content: attr(data-dw-name); position: absolute; top: 0; left: 0; z-index: 50; background: #3d6bff; color: #fff; font: 600 11px/1 system-ui, sans-serif; padding: 4px 6px; }
`;
