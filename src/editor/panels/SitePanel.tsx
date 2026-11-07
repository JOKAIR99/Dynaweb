import { useState } from 'react';
import type { Command } from '../../model/commands';
import type { Project } from '../../model/schema';
import { ATMOSPHERES, GOALS, SECTORS } from '../../model/schema';
import { buildMasterPrompt } from '../../ai/masterPrompt';
import { buildRobots, buildSitemap } from '../../render/seo';
import { download } from '../exportSite';
import { Select, TextInput } from '../controls';

const opts = <T extends string>(values: readonly T[]) => values.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

/** Brief, SEO and hand-off: the project-level settings. */
export function SitePanel({ project, dispatch }: { project: Project; dispatch: (c: Command) => void }) {
  const m = project.meta;
  const set = (patch: Partial<Project['meta']>) => dispatch({ kind: 'updateMeta', patch });
  const [languages, setLanguages] = useState(m.languages.join(', '));
  const [siteUrl, setSiteUrl] = useState(m.siteUrl);
  const [copied, setCopied] = useState<string | null>(null);
  const sitemap = buildSitemap(project);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildMasterPrompt(project));
      setCopied('Copied. Paste it into Claude or another assistant; ask it for Dynaweb commands.');
    } catch {
      download('dynaweb-ai-prompt.txt', buildMasterPrompt(project), 'text/plain');
      setCopied('Clipboard blocked by the browser, so the prompt was downloaded instead.');
    }
  };

  return (
    <div className="ed-stack">
      <div className="ed-sub">Brief</div>
      <Select label="Sector" value={m.sector} options={opts(SECTORS)} onChange={(v) => set({ sector: v })} />
      <TextInput label="Location" value={m.location} onChange={(v) => set({ location: v })} />
      <Select label="Atmosphere" value={m.atmosphere} options={opts(ATMOSPHERES)} onChange={(v) => set({ atmosphere: v })} />
      <Select label="Primary objective" value={m.goal} options={opts(GOALS)} onChange={(v) => set({ goal: v })} />
      <TextInput label="Objective in your words (also the meta description)" value={m.objective} multiline onChange={(v) => set({ objective: v })} />
      <TextInput label="Target audience" value={m.audience} onChange={(v) => set({ audience: v })} />
      <TextInput label="Languages (codes, first is main)" value={languages} onChange={(v) => {
        setLanguages(v);
        const list = v.split(/[,\s]+/).filter(Boolean);
        if (list.length && list.every((l) => /^[a-z]{2,3}(-[A-Za-z]{2})?$/.test(l))) set({ language: list[0], languages: list });
      }} />
      <p className="ed-hint">Content is in the main language for now; translated pages arrive with multi-page sites.</p>

      <div className="ed-sub">Search engines</div>
      <TextInput label="Public website address" value={siteUrl} placeholder="https://www.example.com" onChange={(v) => {
        setSiteUrl(v);
        if (v === '' || /^https:\/\/[^\s]+$/.test(v)) set({ siteUrl: v });
      }} />
      <p className="ed-hint">Used for the canonical URL, Open Graph and the sitemap. Title, description and structured data come from the brief and only use facts you entered.</p>
      <div className="ed-row ed-wrap">
        <button type="button" disabled={!sitemap} title={sitemap ? undefined : 'Set the public website address first'} onClick={() => sitemap && download('sitemap.xml', sitemap, 'application/xml')}>Download sitemap.xml</button>
        <button type="button" onClick={() => download('robots.txt', buildRobots(project), 'text/plain')}>Download robots.txt</button>
      </div>

      <div className="ed-sub">AI hand-off</div>
      <p className="ed-hint">The Dynaweb master prompt, filled in with this brief. The built-in assistant arrives in Phase 5.</p>
      <button type="button" onClick={copyPrompt}>Copy AI prompt</button>
      {copied && <p className="ed-hint" role="status">{copied}</p>}
    </div>
  );
}
