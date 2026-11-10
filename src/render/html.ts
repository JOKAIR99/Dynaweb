import type { Animation, Project, Section } from '../model/schema';
import { EDITOR_CSS, siteCss } from './css';
import { headTags } from './seo';
import { ui } from './i18n';

/**
 * Language of the page being rendered, for Dynaweb's own built-in texts.
 * renderPage() sets it before rendering its sections; rendering is synchronous,
 * so it never leaks between pages. Sections rendered on their own default to English.
 */
let pageLanguage = 'en';
const T = () => ui(pageLanguage);

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
}

/** Only safe URL schemes reach the page. Placeholders like "[booking link]" become "#". */
export function safeHref(href: string): string {
  const v = href.trim();
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(v) && !/^\s*javascript:/i.test(v)) return v;
  return '#';
}

export function safeImage(url: string): string | null {
  const v = url.trim();
  return /^(https:\/\/|data:image\/(png|jpeg|webp|gif);base64,|\/|\.\/)/i.test(v) ? v : null;
}

const isPlaceholder = (text: string) => /^\[.*\]$/.test(text.trim());

function media(url: string, alt: string, attrs = '', priority = false): string {
  const src = safeImage(url);
  // The hero image is the first thing seen: load it right away instead of lazily.
  const load = priority ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  if (src) return `<div class="dw-media"${attrs}><img src="${esc(src)}" alt="${esc(alt)}" ${load}></div>`;
  return `<div class="dw-media"${attrs} role="img" aria-label="${T().imagePlaceholderLabel}">${T().imagePlaceholder}</div>`;
}

/** A safe video: an https .mp4/.webm file, or a YouTube or Vimeo link turned into a privacy-friendly embed. */
export function safeVideo(url: string): { kind: 'file' | 'embed'; src: string } | null {
  const v = url.trim();
  if (/^https:\/\/[^\s"'<>]+\.(mp4|webm)(\?[^\s"'<>]*)?$/i.test(v)) return { kind: 'file', src: v };
  const yt = v.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if (yt) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vimeo = v.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d{4,12})/);
  if (vimeo) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}?dnt=1` };
  return null;
}

/** Paragraphs from plain text: a blank line starts a new paragraph. */
function paragraphs(text: string, attrs = ''): string {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? `<div class="dw-prose"${attrs}>${parts.map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : '';
}

function mediaBlock(section: Section, E: (key: string) => string): string {
  const c = section.content;
  const video = safeVideo(c.videoUrl);
  const label = c.subheading.trim() || c.heading.trim() || 'Video';
  const caption = c.subheading ? `<figcaption class="dw-muted"${E('subheading')}>${esc(c.subheading)}</figcaption>` : '';
  if (!video) return `<figure class="dw-figure">${media(c.imageUrl, label, E('image'))}${caption}</figure>`;
  let inner: string;
  if (video.kind === 'file') {
    const poster = safeImage(c.imageUrl);
    inner = `<video class="dw-video" src="${esc(video.src)}" controls playsinline preload="metadata"${poster ? ` poster="${esc(poster)}"` : ''} aria-label="${esc(label)}"></video>`;
  } else {
    inner = `<iframe class="dw-video" src="${esc(video.src)}" title="${esc(label)}" loading="lazy" allow="fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  return `<figure class="dw-figure"><div class="dw-video-frame"${E('image')}>${inner}</div>${caption}</figure>`;
}

/** Element attributes: a stable key for selection, and the element's own reveal when it has one. */
type ElementAttrs = (key: string) => string;

function elementAttrs(section: Section): ElementAttrs {
  const own = new Map(section.elementAnimations.filter((e) => e.enabled).map((e) => [e.element, e.settings]));
  return (key) => {
    const settings = own.get(key);
    return ` data-dw-el="${esc(key)}"${settings ? ` data-dw-el-reveal="${esc(JSON.stringify(settings))}"` : ''}`;
  };
}

function actions(section: Section, E: ElementAttrs = () => ''): string {
  const links = ([['primary', section.content.primaryAction], ['secondary', section.content.secondaryAction]] as const)
    .filter(([, l]) => l.label.trim() !== '');
  if (links.length === 0) return '';
  return `<div class="dw-actions">${links.map(([key, l]) => `<a class="dw-btn"${E(key)} href="${esc(safeHref(l.href))}">${esc(l.label)}</a>`).join('')}</div>`;
}

function para(text: string, cls = '', attrs = ''): string {
  return text.trim() ? `<p${cls ? ` class="${cls}"` : ''}${attrs}>${esc(text)}</p>` : '';
}

function animAttrs(animations: Animation[]): string {
  return animations
    .filter((a) => a.enabled)
    .map((a) => ` data-dw-${a.type}="${esc(JSON.stringify(a.settings))}"`)
    .join('');
}

function parallaxLayers(section: Section): string {
  const anim = section.animations.find((a) => a.type === 'parallax' && a.enabled);
  if (!anim || anim.type !== 'parallax') return '';
  const s = anim.settings;
  const bg = safeImage(section.content.imageUrl);
  const base = bg
    ? `<div class="dw-plx-layer" data-dw-speed="${s.speed}" style="background-image:url('${esc(bg)}')"></div>`
    : `<div class="dw-plx-layer dw-plx-placeholder" data-dw-speed="${s.speed}"></div>`;
  const extra = s.layers.map((l) => {
    const src = safeImage(l.imageUrl);
    const style = `${src ? `background-image:url('${esc(src)}');` : ''}opacity:${l.opacity};z-index:${l.role === 'foreground' ? 3 : 1}`;
    return `<div class="dw-plx-layer" data-dw-layer="${esc(l.id)}" data-dw-speed="${l.speed}" style="${style}"></div>`;
  });
  return base + extra.join('');
}

function sectionBody(section: Section): string {
  const c = section.content;
  const E = elementAttrs(section);
  switch (section.type) {
    case 'navigation':
      return `<a class="dw-brand" href="#">${esc(c.heading)}</a><nav aria-label="Main"><ul>${c.items
        .map((i) => `<li><a href="${esc(safeHref(i.text))}">${esc(i.title)}</a></li>`).join('')}</ul></nav>`;
    case 'hero': {
      const text = `<h1${E('heading')}>${esc(c.heading)}</h1>${para(c.subheading, 'dw-lead dw-muted', E('subheading'))}${actions(section, E)}`;
      const v = section.style.variant;
      if (v === 'split') return `<div class="dw-hero-text">${text}</div>${media(c.imageUrl, c.heading, E('image'), true)}`;
      if (v === 'fullbleed') {
        // With parallax on, the parallax layer already shows the image.
        const parallax = section.animations.some((a) => a.type === 'parallax' && a.enabled);
        const src = safeImage(c.imageUrl);
        const bg = parallax ? '' : src ? `<img class="dw-hero-bg" src="${esc(src)}" alt="" fetchpriority="high">` : '<div class="dw-hero-bg dw-plx-placeholder"></div>';
        return `${bg}<div class="dw-hero-text">${text}</div>`;
      }
      return text;
    }
    case 'about':
      return `<div class="dw-grid"><div><h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead', E('subheading'))}${para(c.body, 'dw-muted', E('body'))}${actions(section, E)}</div>${media(c.imageUrl, c.heading, E('image'))}</div>`;
    case 'features':
    case 'services':
      return `<h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead dw-muted', E('subheading'))}<div class="dw-grid">${c.items
        .map((i) => `<article class="dw-card"${E(`item:${i.id}`)}>${safeImage(i.imageUrl) ? media(i.imageUrl, i.title) : ''}<h3>${esc(i.title)}</h3>${para(i.text, 'dw-muted')}</article>`).join('')}</div>`;
    case 'gallery': {
      const horizontal = section.animations.find((a) => a.type === 'horizontal' && a.enabled);
      const panels = c.items.map((i) => `<div class="dw-h-panel"${E(`item:${i.id}`)}><figure>${media(i.imageUrl, i.title)}${i.title ? `<figcaption class="dw-muted">${esc(i.title)}</figcaption>` : ''}</figure></div>`).join('');
      if (section.style.variant === 'marquee' && c.items.length) {
        // A second, hidden copy makes the loop seamless; the first copy carries the content.
        const copy = c.items.map((i) => `<div class="dw-h-panel"><figure>${media(i.imageUrl, '')}</figure></div>`).join('');
        return `<h2${E('heading')}>${esc(c.heading)}</h2><div class="dw-marquee"><div class="dw-marquee-track" style="--dw-mq-n:${c.items.length}"><div class="dw-marquee-set">${panels}</div><div class="dw-marquee-set" aria-hidden="true">${copy}</div></div></div>`;
      }
      if (!horizontal || horizontal.type !== 'horizontal') return `<h2${E('heading')}>${esc(c.heading)}</h2><div class="dw-grid">${panels}</div>`;
      const progress = horizontal.settings.showProgress ? '<div class="dw-h-progress" aria-hidden="true"><span></span></div>' : '';
      const dots = horizontal.settings.showIndicators ? `<div class="dw-h-dots" aria-hidden="true">${c.items.map(() => '<i></i>').join('')}</div>` : '';
      return `<div class="dw-h-sticky"><div class="dw-inner"><h2${E('heading')}>${esc(c.heading)}</h2></div><div class="dw-h-track">${panels}</div>${progress}${dots}</div>`;
    }
    case 'text':
      return `${c.heading ? `<h2${E('heading')}>${esc(c.heading)}</h2>` : ''}${para(c.subheading, 'dw-lead', E('subheading'))}${paragraphs(c.body, E('body'))}${actions(section, E)}`;
    case 'media':
      return `${c.heading ? `<h2${E('heading')}>${esc(c.heading)}</h2>` : ''}${mediaBlock(section, E)}`;
    case 'custom': {
      const hasMedia = Boolean(safeImage(c.imageUrl) || safeVideo(c.videoUrl));
      const items = c.items.length
        ? `<div class="dw-grid">${c.items.map((i) => `<article class="dw-card"${E(`item:${i.id}`)}>${safeImage(i.imageUrl) ? media(i.imageUrl, i.title) : ''}<h3>${esc(i.title)}</h3>${para(i.text, 'dw-muted')}</article>`).join('')}</div>`
        : '';
      return `<div class="dw-grid dw-custom"><div>${c.heading ? `<h2${E('heading')}>${esc(c.heading)}</h2>` : ''}${para(c.subheading, 'dw-lead', E('subheading'))}${paragraphs(c.body, E('body'))}${actions(section, E)}</div>${hasMedia ? mediaBlock(section, E) : ''}</div>${items}`;
    }
    case 'statistics':
      return `<h2 class="dw-stats-head"${E('heading')}>${esc(c.heading)}</h2><dl class="dw-grid dw-stats">${c.items
        .map((i) => `<div class="dw-stat"${E(`item:${i.id}`)}><dt class="dw-muted">${esc(i.text)}</dt><dd>${esc(i.title)}</dd></div>`).join('')}</dl>`;
    case 'showcase':
      return `<h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead dw-muted', E('subheading'))}<div class="dw-grid dw-products">${c.items
        .map((i) => `<article class="dw-card dw-product"${E(`item:${i.id}`)}>${media(i.imageUrl, i.title)}<div><h3>${esc(i.title)}</h3>${para(i.text, 'dw-muted')}</div></article>`).join('')}</div>${actions(section, E)}`;
    case 'team':
      return `<h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead dw-muted', E('subheading'))}<ul class="dw-grid dw-team">${c.items
        .map((i) => `<li class="dw-person"${E(`item:${i.id}`)}>${media(i.imageUrl, i.title)}<h3>${esc(i.title)}</h3>${para(i.text, 'dw-muted')}</li>`).join('')}</ul>`;
    case 'testimonials':
      return `<h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-muted', E('subheading'))}<div class="dw-grid">${c.items
        .map((i) => `<figure class="dw-card dw-quote"${E(`item:${i.id}`)}><blockquote>${para(i.text, 'dw-lead')}</blockquote><figcaption>${esc(i.title)}</figcaption></figure>`).join('')}</div>`;
    case 'pricing':
      return `<h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead dw-muted', E('subheading'))}<div class="dw-grid">${c.items
        .map((i) => `<article class="dw-card dw-price"${E(`item:${i.id}`)}><h3>${esc(i.title)}</h3>${para(i.text)}</article>`).join('')}</div>${actions(section, E)}`;
    case 'contact':
      return `<div class="dw-grid"><div><h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead', E('subheading'))}${para(c.body, 'dw-muted', E('body'))}</div>${contactForm(section)}</div>`;
    case 'cta':
      return `<h2${E('heading')}>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead', E('subheading'))}${actions(section, E)}`;
    case 'footer':
      return `<div class="dw-grid"><div><p class="dw-brand">${esc(c.heading)}</p>${para(c.body, '', E('body'))}</div>${para(c.subheading, 'dw-muted', E('subheading'))}</div>`;
  }
}

const TAGS: Record<Section['type'], string> = {
  navigation: 'header', hero: 'section', about: 'section', features: 'section', services: 'section', gallery: 'section',
  testimonials: 'section', pricing: 'section', text: 'section', media: 'section', custom: 'section', statistics: 'section', showcase: 'section', team: 'section', cta: 'section', contact: 'section', footer: 'footer',
};

/** Only https endpoints may receive form data. */
export function safeEndpoint(url: string): string | null {
  return /^https:\/\/[^\s"'<>]+$/.test(url.trim()) ? url.trim() : null;
}

/**
 * Contact or booking form. It submits for real when an https endpoint is set
 * (plain POST without JavaScript, fetch with inline feedback with it). With no
 * endpoint it says it is not connected; it never pretends a message was sent
 * or a booking confirmed.
 */
function contactForm(section: Section): string {
  const c = section.content;
  const endpoint = safeEndpoint(c.formEndpoint);
  const id = (name: string) => `${section.id}-${name}`;
  const field = (name: string, label: string, input: string) =>
    `<div class="dw-field"><label for="${id(name)}">${label}</label>${input}<p class="dw-error" id="${id(name)}-err" aria-live="polite"></p></div>`;
  const attrs = (name: string, extra: string) => `id="${id(name)}" name="${name}" aria-describedby="${id(name)}-err" ${extra}`;
  const booking = c.formKind === 'booking'
    ? field('date', T().date, `<input type="date" ${attrs('date', 'required')}>`) +
      field('guests', T().people, `<input type="number" inputmode="numeric" min="1" max="99" value="2" ${attrs('guests', 'required')}>`)
    : '';
  const action = endpoint ? ` action="${esc(endpoint)}" method="post"` : '';
  const submit = c.formKind === 'booking' ? T().sendBooking : T().sendMessage;
  const note = endpoint
    ? (c.formKind === 'booking' ? `<p class="dw-muted dw-small">${T().requestNote}</p>` : '')
    : `<p class="dw-muted dw-small" data-dw-offline>${T().offlineNote}</p>`;
  return `<form class="dw-form" novalidate data-dw-form="${c.formKind}"${endpoint ? ` data-dw-endpoint="${esc(endpoint)}"` : ''}${action}>` +
    field('name', T().name, `<input type="text" autocomplete="name" maxlength="120" ${attrs('name', 'required')}>`) +
    field('email', T().email, `<input type="email" autocomplete="email" maxlength="200" ${attrs('email', 'required')}>`) +
    booking +
    field('message', c.formKind === 'booking' ? T().bookingMessage : T().message, `<textarea rows="4" maxlength="4000" ${attrs('message', c.formKind === 'booking' ? '' : 'required')}></textarea>`) +
    `<div class="dw-hp" aria-hidden="true"><label>${T().honeypot}<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>` +
    `<button type="submit" class="dw-btn">${submit}</button><p class="dw-form-status" role="status" aria-live="polite"></p>${note}</form>`;
}

export function renderSection(section: Section, anchor: string = section.type): string {
  const st = section.style;
  const classes = [
    'dw-section', `dw-${section.type === 'navigation' ? 'nav' : section.type}`, `dw-bg-${st.background}`, `dw-align-${st.align}`, `dw-v-${st.variant}`,
    ...(['desktop', 'tablet', 'mobile'] as const).filter((d) => st.hidden[d]).map((d) => `dw-hide-${d}`),
  ];
  const horizontal = section.animations.find((a) => a.type === 'horizontal' && a.enabled);
  if (horizontal?.type === 'horizontal' && horizontal.settings.mobileLayout === 'swipe') classes.push('dw-h-swipe');
  const style = [
    `--dw-pad:${st.paddingY}px`, `--dw-max:${st.maxWidth}px`, `--dw-cols:${st.columns}`,
    st.minHeight ? `min-height:${st.minHeight}vh` : '',
    horizontal?.type === 'horizontal' ? `--dw-h-panel:${horizontal.settings.panelWidth}vw;--dw-h-gap:${horizontal.settings.gap}px` : '',
  ].filter(Boolean).join(';');
  const tag = TAGS[section.type];
  const body = sectionBody(section);
  const inner = section.type === 'gallery' && horizontal ? body : `<div class="dw-inner">${body}</div>`;
  return `<${tag} id="${esc(anchor)}" class="${classes.join(' ')}" style="${style}" data-dw-id="${esc(section.id)}" data-dw-name="${esc(section.name)}"${animAttrs(section.animations)}>${parallaxLayers(section)}${inner}</${tag}>`;
}

export interface RenderOptions {
  pageId?: string;
  mode: 'editor' | 'export';
  selectedId?: string | null;
  /** Element key inside the selected section, for element-level editing. */
  selectedElement?: string | null;
  runtimeJs: string;
}

/** Placeholder count: lets the UI warn before export that facts are still missing. */
export function countPlaceholders(project: Project): number {
  let n = 0;
  for (const page of project.pages) for (const s of page.sections) {
    const c = s.content;
    for (const t of [c.heading, c.subheading, c.body, c.primaryAction.label, ...c.items.flatMap((i) => [i.title, i.text])]) if (isPlaceholder(t)) n++;
  }
  return n;
}

/**
 * Unique, readable anchors: the first section of a type gets the type name
 * (so nav links like #contact work); later ones get a numbered suffix.
 * Older projects without a contact section keep #contact on their call to action.
 */
export function anchorFor(sections: Section[], index: number): string {
  const hasContact = sections.some((x) => x.type === 'contact');
  const baseOf = (x: Section) => (x.type === 'cta' && !hasContact ? 'contact' : x.type === 'navigation' ? 'top' : x.type);
  const base = baseOf(sections[index]);
  const earlier = sections.slice(0, index).filter((x) => baseOf(x) === base).length;
  return earlier === 0 ? base : `${base}-${earlier + 1}`;
}

export function renderPage(project: Project, opts: RenderOptions): string {
  pageLanguage = project.meta.language;
  const page = project.pages.find((p) => p.id === opts.pageId) ?? project.pages[0];
  const t = project.theme;
  const editor = opts.mode === 'editor';
  const body = page.sections.map((s, i) => renderSection(s, anchorFor(page.sections, i))).join('\n');
  const editorBits = editor
    ? `<style>${EDITOR_CSS}</style><script>
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-dw-id]');
  var part = e.target.closest('[data-dw-el]');
  if (e.target.closest('a, button')) e.preventDefault();
  if (el) parent.postMessage({ source: 'dynaweb-canvas', type: 'select', id: el.getAttribute('data-dw-id'), element: part && el.contains(part) ? part.getAttribute('data-dw-el') : null }, '*');
});
var dwScrollT = 0;
addEventListener('scroll', function () { clearTimeout(dwScrollT); dwScrollT = setTimeout(function () { parent.postMessage({ source: 'dynaweb-canvas', type: 'scroll', y: scrollY }, '*'); }, 100); }, { passive: true });
addEventListener('message', function (e) { var d = e.data; if (d && d.source === 'dynaweb-editor' && d.type === 'restore' && typeof d.y === 'number') scrollTo(0, d.y); });
var sel = ${JSON.stringify(opts.selectedId ?? null)};
var selEl = ${JSON.stringify(opts.selectedElement ?? null)};
if (sel) { var s = document.querySelector('[data-dw-id="' + sel + '"]'); if (s) { s.classList.add('dw-selected'); if (selEl) { var p = s.querySelector('[data-dw-el="' + selEl + '"]'); if (p) p.classList.add('dw-el-selected'); } } }
</script>`
    : '';
  return `<!doctype html>
<html lang="${esc(project.meta.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headTags(project, page)}
<meta name="generator" content="Dynaweb Studio">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(t.fonts.googleFontsHref)}">
<style>${siteCss(t)}</style>
</head>
<body data-dw-motion="${t.motion}"${t.interactions.magneticButtons ? ' data-dw-magnetic' : ''}${t.interactions.cardHover ? ' class="dw-hover"' : ''}>
${body}
<script>${opts.runtimeJs}</script>
${editorBits}
</body>
</html>`;
}
