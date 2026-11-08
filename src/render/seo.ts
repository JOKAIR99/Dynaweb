import type { Page, Project } from '../model/schema';

const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
const isPlaceholder = (t: string) => /\[[^\]]*\]/.test(t);
/** A value is published only if it is real: non-empty and free of [placeholders]. */
const real = (t: string | undefined): string | null => (t && t.trim() && !isPlaceholder(t) ? t.trim() : null);

export function pageUrl(project: Project, page: Page): string | null {
  const base = project.meta.siteUrl.replace(/\/+$/, '');
  if (!base) return null;
  return page.slug ? `${base}/${page.slug}/` : `${base}/`;
}

function description(project: Project): string {
  return real(project.meta.objective) ?? real(project.meta.purpose) ?? real(project.meta.description) ?? project.name;
}

/**
 * schema.org JSON-LD built only from facts the owner entered. Nothing is
 * inferred: the type is the one the owner chose (Organization when they chose
 * none), and no phone, price range, rating or opening hours are ever made up.
 */
export function structuredData(project: Project, page: Page): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': project.meta.schemaType || 'Organization',
    name: project.name,
  };
  const url = pageUrl(project, page);
  if (url) data.url = url;
  const desc = real(project.meta.objective);
  if (desc) data.description = desc;
  const location = real(project.meta.location);
  if (location) data.address = { '@type': 'PostalAddress', addressLocality: location };
  return data;
}

export function headTags(project: Project, page: Page): string {
  const desc = description(project);
  const url = pageUrl(project, page);
  const title = page.slug ? `${page.title} | ${project.name}` : project.name;
  const hero = page.sections.find((s) => s.type === 'hero');
  const image = hero && /^https:\/\//.test(hero.content.imageUrl) ? hero.content.imageUrl : null;
  const locale = project.meta.language.replace('-', '_');
  const json = JSON.stringify(structuredData(project, page)).replace(/</g, '\\u003c');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    url ? `<link rel="canonical" href="${esc(url)}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:locale" content="${esc(locale)}">`,
    `<meta property="og:site_name" content="${esc(project.name)}">`,
    url ? `<meta property="og:url" content="${esc(url)}">` : '',
    image ? `<meta property="og:image" content="${esc(image)}">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<script type="application/ld+json">${json}</script>`,
  ].filter(Boolean).join('\n');
}

/** sitemap.xml for every page. Needs the public site address. */
export function buildSitemap(project: Project): string | null {
  if (!project.meta.siteUrl) return null;
  const day = project.updatedAt.slice(0, 10);
  const urls = project.pages
    .map((p) => pageUrl(project, p))
    .filter((u): u is string => u !== null)
    .map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${day}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildRobots(project: Project): string {
  const base = project.meta.siteUrl.replace(/\/+$/, '');
  return `User-agent: *\nAllow: /\n${base ? `\nSitemap: ${base}/sitemap.xml\n` : ''}`;
}
