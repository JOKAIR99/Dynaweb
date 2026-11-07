import type { Animation, Project, Section } from '../model/schema';
import { EDITOR_CSS, siteCss } from './css';

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

function media(url: string, alt: string): string {
  const src = safeImage(url);
  if (src) return `<div class="dw-media"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></div>`;
  return `<div class="dw-media" role="img" aria-label="Image placeholder">[Image]</div>`;
}

function actions(section: Section): string {
  const links = [section.content.primaryAction, section.content.secondaryAction].filter((l) => l.label.trim() !== '');
  if (links.length === 0) return '';
  return `<div class="dw-actions">${links.map((l) => `<a class="dw-btn" href="${esc(safeHref(l.href))}">${esc(l.label)}</a>`).join('')}</div>`;
}

function para(text: string, cls = ''): string {
  return text.trim() ? `<p${cls ? ` class="${cls}"` : ''}>${esc(text)}</p>` : '';
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
  switch (section.type) {
    case 'navigation':
      return `<a class="dw-brand" href="#">${esc(c.heading)}</a><nav aria-label="Main"><ul>${c.items
        .map((i) => `<li><a href="${esc(safeHref(i.text))}">${esc(i.title)}</a></li>`).join('')}</ul></nav>`;
    case 'hero':
      return `<h1>${esc(c.heading)}</h1>${para(c.subheading, 'dw-lead dw-muted')}${actions(section)}`;
    case 'about':
      return `<div class="dw-grid"><div><h2>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead')}${para(c.body, 'dw-muted')}${actions(section)}</div>${media(c.imageUrl, c.heading)}</div>`;
    case 'features':
      return `<h2>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead dw-muted')}<div class="dw-grid">${c.items
        .map((i) => `<article class="dw-card">${safeImage(i.imageUrl) ? media(i.imageUrl, i.title) : ''}<h3>${esc(i.title)}</h3>${para(i.text, 'dw-muted')}</article>`).join('')}</div>`;
    case 'gallery': {
      const horizontal = section.animations.some((a) => a.type === 'horizontal' && a.enabled);
      const panels = c.items.map((i) => `<div class="dw-h-panel"><figure>${media(i.imageUrl, i.title)}${i.title ? `<figcaption class="dw-muted">${esc(i.title)}</figcaption>` : ''}</figure></div>`).join('');
      if (!horizontal) return `<h2>${esc(c.heading)}</h2><div class="dw-grid">${panels}</div>`;
      return `<div class="dw-h-sticky"><div class="dw-inner"><h2>${esc(c.heading)}</h2></div><div class="dw-h-track">${panels}</div><div class="dw-h-progress" aria-hidden="true"><span></span></div><div class="dw-h-dots" aria-hidden="true">${c.items.map(() => '<i></i>').join('')}</div></div>`;
    }
    case 'cta':
      return `<h2>${esc(c.heading)}</h2>${para(c.subheading, 'dw-lead')}${actions(section)}`;
    case 'footer':
      return `<div class="dw-grid"><div><p class="dw-brand">${esc(c.heading)}</p>${para(c.body)}</div>${para(c.subheading, 'dw-muted')}</div>`;
  }
}

const TAGS: Record<Section['type'], string> = {
  navigation: 'header', hero: 'section', about: 'section', features: 'section', gallery: 'section', cta: 'section', footer: 'footer',
};

export function renderSection(section: Section): string {
  const st = section.style;
  const classes = [
    'dw-section', `dw-${section.type === 'navigation' ? 'nav' : section.type}`, `dw-bg-${st.background}`, `dw-align-${st.align}`,
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
  const anchor = section.type === 'cta' ? 'contact' : section.type;
  const body = sectionBody(section);
  const inner = section.type === 'gallery' && horizontal ? body : `<div class="dw-inner">${body}</div>`;
  return `<${tag} id="${esc(anchor)}" class="${classes.join(' ')}" style="${style}" data-dw-id="${esc(section.id)}" data-dw-name="${esc(section.name)}"${animAttrs(section.animations)}>${parallaxLayers(section)}${inner}</${tag}>`;
}

export interface RenderOptions {
  pageId?: string;
  mode: 'editor' | 'export';
  selectedId?: string | null;
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

export function renderPage(project: Project, opts: RenderOptions): string {
  const page = project.pages.find((p) => p.id === opts.pageId) ?? project.pages[0];
  const t = project.theme;
  const editor = opts.mode === 'editor';
  const body = page.sections.map(renderSection).join('\n');
  const editorBits = editor
    ? `<style>${EDITOR_CSS}</style><script>
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-dw-id]');
  if (e.target.closest('a')) e.preventDefault();
  if (el) parent.postMessage({ source: 'dynaweb-canvas', type: 'select', id: el.getAttribute('data-dw-id') }, '*');
});
var dwScrollT = 0;
addEventListener('scroll', function () { clearTimeout(dwScrollT); dwScrollT = setTimeout(function () { parent.postMessage({ source: 'dynaweb-canvas', type: 'scroll', y: scrollY }, '*'); }, 100); }, { passive: true });
addEventListener('message', function (e) { var d = e.data; if (d && d.source === 'dynaweb-editor' && d.type === 'restore' && typeof d.y === 'number') scrollTo(0, d.y); });
var sel = ${JSON.stringify(opts.selectedId ?? null)};
if (sel) { var s = document.querySelector('[data-dw-id="' + sel + '"]'); if (s) { s.classList.add('dw-selected'); } }
</script>`
    : '';
  return `<!doctype html>
<html lang="${esc(project.meta.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name)}</title>
<meta name="description" content="${esc(project.meta.objective || project.name)}">
<meta name="generator" content="Dynaweb Studio">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(t.fonts.googleFontsHref)}">
<style>${siteCss(t)}</style>
</head>
<body data-dw-motion="${t.motion}">
${body}
<script>${opts.runtimeJs}</script>
${editorBits}
</body>
</html>`;
}
