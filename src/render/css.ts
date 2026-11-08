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
/* Layout variants (dw-v-*). "standard" adds nothing. */
.dw-nav.dw-v-centered .dw-inner { flex-direction: column; justify-content: center; text-align: center; }
.dw-hero.dw-v-split .dw-inner { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: clamp(1.5rem, 5vw, 4rem); align-items: center; text-align: start; }
.dw-hero.dw-v-split .dw-actions { justify-content: flex-start; }
.dw-hero.dw-v-split .dw-media { aspect-ratio: 4 / 5; }
.dw-hero.dw-v-fullbleed { align-items: end; color: var(--dw-bg); }
.dw-hero.dw-v-fullbleed .dw-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.dw-hero.dw-v-fullbleed::after { content: ""; position: absolute; inset: 0; z-index: 1; background: linear-gradient(to top, var(--dw-text), transparent 70%); opacity: 0.85; pointer-events: none; }
.dw-hero.dw-v-fullbleed .dw-inner { text-align: start; }
.dw-hero.dw-v-fullbleed .dw-muted { color: inherit; opacity: 0.85; }
.dw-hero.dw-v-fullbleed .dw-actions { justify-content: flex-start; }
.dw-hero.dw-v-editorial .dw-inner { text-align: start; }
.dw-hero.dw-v-editorial h1 { font-size: clamp(3rem, 9vw, 8.5rem); line-height: 0.95; max-width: 14ch; }
.dw-hero.dw-v-editorial p { margin-inline: 0 0; margin-left: auto; max-width: 36ch; }
.dw-hero.dw-v-editorial .dw-actions { justify-content: flex-end; }
.dw-about.dw-v-reversed .dw-grid > .dw-media { order: -1; }
.dw-about.dw-v-editorial .dw-media { display: none; }
.dw-about.dw-v-editorial .dw-grid { grid-template-columns: minmax(0, 1fr); }
.dw-about.dw-v-editorial h2 { font-size: var(--dw-step-4); max-width: 18ch; }
.dw-about.dw-v-editorial p { columns: 2 22ch; column-gap: 3rem; max-width: none; }
.dw-v-list .dw-grid { grid-template-columns: minmax(0, 1fr); gap: 0; counter-reset: dw-item; }
.dw-v-list .dw-card { background: none; border-radius: 0; border-top: 1px solid var(--dw-muted); padding: 1.5rem 0; display: grid; grid-template-columns: 4rem minmax(0, 1fr) minmax(0, 1.4fr); gap: 1rem; align-items: baseline; counter-increment: dw-item; }
.dw-v-list .dw-card::before { content: counter(dw-item, decimal-leading-zero); font-family: var(--dw-font-display); color: var(--dw-accent); font-size: var(--dw-step-1); }
.dw-v-list .dw-card .dw-media { display: none; }
.dw-v-list .dw-card p { margin: 0; }
.dw-v-asymmetric .dw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dw-v-asymmetric .dw-card:first-child { grid-row: span 2; display: flex; flex-direction: column; justify-content: end; min-height: 22rem; background: var(--dw-accent); color: var(--dw-accent-text); }
.dw-v-asymmetric .dw-card:first-child .dw-muted { color: inherit; opacity: 0.85; }
.dw-gallery.dw-v-masonry .dw-grid { display: block; columns: var(--dw-cols, 3) 14rem; column-gap: 1.25rem; }
.dw-gallery.dw-v-masonry .dw-h-panel { break-inside: avoid; margin-bottom: 1.25rem; }
.dw-gallery.dw-v-masonry .dw-h-panel:nth-child(3n + 1) .dw-media { aspect-ratio: 3 / 4; }
.dw-gallery.dw-v-masonry .dw-h-panel:nth-child(3n + 2) .dw-media { aspect-ratio: 1; }
.dw-gallery.dw-v-filmstrip .dw-grid { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 1rem; padding-bottom: 0.75rem; }
.dw-gallery.dw-v-filmstrip .dw-h-panel { flex: 0 0 min(80%, 26rem); scroll-snap-align: start; }
.dw-testimonials.dw-v-spotlight .dw-grid { grid-template-columns: minmax(0, 1fr); }
.dw-testimonials.dw-v-spotlight .dw-quote { background: none; padding: 0; border-left: 4px solid var(--dw-accent); padding-left: clamp(1rem, 3vw, 2rem); }
.dw-testimonials.dw-v-spotlight .dw-quote .dw-lead { font-family: var(--dw-font-display); font-size: var(--dw-step-2); line-height: 1.25; max-width: 30ch; }
.dw-cta.dw-v-split .dw-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.5rem; text-align: start; }
.dw-cta.dw-v-split .dw-inner > * { margin: 0; }
.dw-cta.dw-v-split .dw-actions { margin: 0; }
.dw-contact.dw-v-centered .dw-grid { grid-template-columns: minmax(0, 1fr); max-width: 40rem; margin-inline: auto; text-align: center; }
.dw-contact.dw-v-centered p { margin-inline: auto; }
.dw-footer.dw-v-stacked .dw-grid { grid-template-columns: minmax(0, 1fr); text-align: center; }
.dw-footer.dw-v-stacked p { margin-inline: auto; }
@media (max-width: 767px) {
  .dw-hero.dw-v-split .dw-inner { grid-template-columns: minmax(0, 1fr); }
  .dw-hero.dw-v-split .dw-media { aspect-ratio: 4 / 3; }
  .dw-v-list .dw-card { grid-template-columns: 3rem minmax(0, 1fr); }
  .dw-v-list .dw-card p { grid-column: 2; }
  .dw-v-asymmetric .dw-grid { grid-template-columns: minmax(0, 1fr); }
  .dw-v-asymmetric .dw-card:first-child { min-height: 14rem; }
  .dw-about.dw-v-editorial p { columns: 1; }
  .dw-hero.dw-v-editorial p { margin-left: 0; }
  .dw-hero.dw-v-editorial .dw-actions { justify-content: flex-start; }
}
/* Text, media, custom */
.dw-prose p { max-width: 68ch; }
.dw-text.dw-v-editorial h2 { font-size: var(--dw-step-4); max-width: 16ch; }
.dw-text.dw-v-editorial .dw-prose { columns: 2 24ch; column-gap: 3rem; }
.dw-text.dw-v-editorial .dw-prose p { break-inside: avoid; }
.dw-figure { margin: 0; }
.dw-figure figcaption { margin-top: 0.75rem; }
.dw-figure .dw-media { aspect-ratio: 16 / 9; }
.dw-video-frame { position: relative; aspect-ratio: 16 / 9; border-radius: var(--dw-radius); overflow: hidden; background: var(--dw-surface); }
.dw-video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; object-fit: cover; }
.dw-section.dw-media.dw-v-fullbleed .dw-inner { width: 100%; max-width: none; }
.dw-section.dw-media.dw-v-fullbleed .dw-video-frame, .dw-section.dw-media.dw-v-fullbleed .dw-figure .dw-media { border-radius: 0; }
.dw-section.dw-media.dw-v-fullbleed figcaption, .dw-section.dw-media.dw-v-fullbleed h2 { padding-inline: var(--dw-gutter); }
.dw-custom { align-items: center; }
.dw-custom.dw-grid { grid-template-columns: minmax(0, 1fr); }
.dw-v-split .dw-custom.dw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dw-custom + .dw-grid { margin-top: clamp(1.5rem, 4vw, 3rem); }
@media (max-width: 767px) { .dw-text.dw-v-editorial .dw-prose { columns: 1; } .dw-v-split .dw-custom.dw-grid { grid-template-columns: minmax(0, 1fr); } }
/* Statistics, showcase, team */
.dw-stats { margin: 0; }
.dw-stat { display: flex; flex-direction: column-reverse; gap: 0.25rem; }
.dw-stat dd { margin: 0; font-family: var(--dw-font-display); font-weight: var(--dw-display-weight); font-size: var(--dw-step-3); line-height: 1; color: var(--dw-accent); overflow-wrap: break-word; min-width: 0; }
.dw-statistics.dw-v-band { background: var(--dw-accent); color: var(--dw-accent-text); }
.dw-statistics.dw-v-band .dw-stat dd { color: inherit; }
.dw-statistics.dw-v-band .dw-muted { color: inherit; opacity: 0.85; }
.dw-statistics.dw-v-band .dw-stats-head { font-size: var(--dw-step-1); }
.dw-product { padding: 0; overflow: hidden; display: grid; }
.dw-product > div { padding: 1.25rem 1.5rem 1.5rem; }
.dw-product .dw-media { border-radius: 0; }
.dw-showcase.dw-v-standard .dw-products { grid-template-columns: minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3rem); }
.dw-showcase.dw-v-standard .dw-product { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: center; background: none; }
.dw-showcase.dw-v-standard .dw-product:nth-child(even) .dw-media { order: 2; }
.dw-showcase.dw-v-standard .dw-product .dw-media { border-radius: var(--dw-radius); }
.dw-team { list-style: none; padding: 0; margin: 0; }
.dw-person .dw-media { aspect-ratio: 4 / 5; margin-bottom: 1rem; }
.dw-person h3 { margin-bottom: 0.25rem; }
.dw-team.dw-grid { row-gap: 2.5rem; }
.dw-v-list .dw-team { grid-template-columns: minmax(0, 1fr); gap: 0; }
.dw-v-list .dw-person { display: grid; grid-template-columns: 4rem minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 0; border-top: 1px solid var(--dw-muted); }
.dw-v-list .dw-person .dw-media { aspect-ratio: 1; margin: 0; border-radius: 50%; }
.dw-v-list .dw-person p { margin: 0; }
@media (max-width: 767px) {
  .dw-showcase.dw-v-standard .dw-product { grid-template-columns: minmax(0, 1fr); }
  .dw-showcase.dw-v-standard .dw-product:nth-child(even) .dw-media { order: 0; }
  .dw-v-list .dw-person { grid-template-columns: 3.5rem minmax(0, 1fr); }
  .dw-v-list .dw-person p { grid-column: 2; }
  .dw-stats.dw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dw-stat dd { font-size: var(--dw-step-2); }
}
/* Testimonials, pricing */
.dw-quote { margin: 0; } .dw-quote blockquote { margin: 0 0 1rem; } .dw-quote figcaption { font-weight: 600; }
.dw-price h3 { margin-bottom: 0.75rem; }
.dw-small { font-size: 0.875rem; }
/* Forms */
.dw-form { display: grid; gap: 1rem; padding: clamp(1.25rem, 3vw, 2rem); border-radius: var(--dw-radius); background: var(--dw-surface); color: var(--dw-text); text-align: start; }
.dw-bg-surface .dw-form { background: var(--dw-bg); }
.dw-field { display: grid; gap: 0.35rem; }
.dw-field label { font-weight: 600; }
.dw-form input, .dw-form textarea { font: inherit; color: var(--dw-text); background: var(--dw-bg); border: 1px solid var(--dw-muted); border-radius: calc(var(--dw-radius) / 2); padding: 0.75em 0.9em; min-height: 44px; width: 100%; }
.dw-form input:focus-visible, .dw-form textarea:focus-visible { outline: 3px solid var(--dw-accent); outline-offset: 1px; }
.dw-form [aria-invalid="true"] { border-color: var(--dw-accent); border-width: 2px; }
.dw-error { margin: 0; min-height: 1.2em; font-size: 0.875rem; color: var(--dw-accent); }
.dw-form-status { margin: 0; font-weight: 600; min-height: 1.2em; }
.dw-form button[disabled] { opacity: 0.6; cursor: progress; }
.dw-hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
/* Cinematic hero intro (runtime adds .dw-intro, then .dw-in) */
html.dw-js .dw-intro h1 .dw-w { display: inline-block; opacity: 0; transform: translateY(0.55em) rotate(2deg); filter: blur(6px); transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1), filter 700ms ease-out; transition-delay: calc(120ms + var(--dw-wi, 0) * 75ms); }
html.dw-js .dw-intro.dw-in h1 .dw-w { opacity: 1; transform: none; filter: none; }
html.dw-js .dw-intro .dw-lead, html.dw-js .dw-intro .dw-actions { opacity: 0; transform: translateY(18px); transition: opacity 800ms ease-out, transform 900ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: calc(350ms + var(--dw-wn, 4) * 75ms); }
html.dw-js .dw-intro .dw-actions { transition-delay: calc(500ms + var(--dw-wn, 4) * 75ms); }
html.dw-js .dw-intro.dw-in .dw-lead, html.dw-js .dw-intro.dw-in .dw-actions { opacity: 1; transform: none; }
html.dw-js .dw-intro .dw-hero-bg, html.dw-js .dw-intro .dw-media img { transform: scale(1.14); transform-origin: 60% 40%; transition: transform 9s cubic-bezier(0.22, 1, 0.36, 1); }
html.dw-js .dw-intro.dw-in .dw-hero-bg, html.dw-js .dw-intro.dw-in .dw-media img { transform: scale(1); }
.dw-hero .dw-media { overflow: hidden; }

/* Micro-interactions */
.dw-hover .dw-card { transition: transform 220ms ease-out, opacity 220ms ease-out; }
.dw-hover .dw-card:hover { transform: translateY(-4px); }
.dw-btn.dw-magnet { transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1); }
@media (max-width: 767px) { .dw-grid { grid-template-columns: minmax(0, 1fr); } .dw-hide-mobile { display: none !important; } }
@media (min-width: 768px) and (max-width: 1099px) { .dw-grid { grid-template-columns: repeat(min(var(--dw-cols, 3), 2), minmax(0, 1fr)); } .dw-hide-tablet { display: none !important; } }
@media (min-width: 1100px) { .dw-hide-desktop { display: none !important; } }
@media (prefers-reduced-motion: reduce) {
  .dw-rv { transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; }
  .dw-plx-layer { transform: none !important; }
  .dw-intro h1 .dw-w, .dw-intro .dw-lead, .dw-intro .dw-actions, .dw-intro .dw-hero-bg, .dw-intro .dw-media img { transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
  .dw-btn { transition: none; }
  .dw-hover .dw-card, .dw-hover .dw-card:hover, .dw-btn.dw-magnet { transition: none; transform: none !important; }
}
`;
}

export const EDITOR_CSS = `
[data-dw-id] { cursor: pointer; }
[data-dw-id]:hover { outline: 2px dashed rgba(64, 120, 255, 0.6); outline-offset: -2px; }
[data-dw-id].dw-selected { outline: 2px solid #3d6bff; outline-offset: -2px; }
[data-dw-id].dw-selected [data-dw-el]:hover { outline: 1px dashed rgba(255, 122, 26, 0.8); outline-offset: 2px; }
[data-dw-el].dw-el-selected { outline: 2px solid #ff7a1a !important; outline-offset: 2px; }
[data-dw-id].dw-selected::after { content: attr(data-dw-name); position: absolute; top: 0; left: 0; z-index: 50; background: #3d6bff; color: #fff; font: 600 11px/1 system-ui, sans-serif; padding: 4px 6px; }
`;
