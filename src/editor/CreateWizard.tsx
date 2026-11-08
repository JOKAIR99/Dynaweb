import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Atmosphere, Goal, Project, ProjectMeta, SectionType } from '../model/schema';
import { ATMOSPHERES, GOALS, SECTION_TYPES, projectMetaSchema } from '../model/schema';
import { createRandomIds } from '../model/ids';
import { generateProject, planSections } from '../generator/generate';
import { proposeDirections } from '../generator/direction';
import { PRESETS } from '../generator/presets';
import { AREAS, getArea } from '../generator/areas';
import { SECTION_LABELS } from '../model/defaults';
import { Select, TextInput } from './controls';

interface Props { onCreate: (p: Project) => void; onCancel: () => void }

const label = (v: string) => v[0].toUpperCase() + v.slice(1);

/**
 * Creation flow for any kind of website. Nothing is a fixed category: the
 * owner describes the project in their own words and decides its structure.
 */
export function CreateWizard({ onCreate, onCancel }: Props) {
  const [areaId, setAreaId] = useState('');
  const [schemaType, setSchemaType] = useState('');
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [activity, setActivity] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState<Goal>('information');
  const [objective, setObjective] = useState('');
  const [location, setLocation] = useState('');
  const [languages, setLanguages] = useState('en');
  const [siteUrl, setSiteUrl] = useState('');
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('other');
  const [references, setReferences] = useState('');
  const [colors, setColors] = useState('');
  const [typography, setTypography] = useState('');
  const [imagery, setImagery] = useState('');
  const [layout, setLayout] = useState('');
  const [motionPrefs, setMotionPrefs] = useState('');
  const [features, setFeatures] = useState('');
  const [technical, setTechnical] = useState('');
  const [brief, setBrief] = useState('');
  const [picked, setPicked] = useState<Set<SectionType> | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [motion, setMotion] = useState<0 | 1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const langList = languages.split(/[,\s]+/).map((l) => l.trim()).filter(Boolean);
  const meta: ProjectMeta = {
    purpose, description, activity, location, audience, goal, objective,
    language: langList[0] ?? 'en', languages: langList.length ? langList : ['en'],
    atmosphere, references, colors, typography, imagery, layout, motion: motionPrefs, features, technical, brief,
    siteUrl: siteUrl.trim(), schemaType,
  };
  const suggested = planSections(meta);
  // Until the owner touches the checklist, it follows the suggestion; after that it is theirs.
  const structure = picked ?? new Set(suggested);
  const proposals = useMemo(() => proposeDirections(meta, name, 3), [atmosphere, goal, colors, imagery, location, activity, name]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = presetId ?? proposals[0]?.presetId ?? PRESETS[0].presetId;

  const area = getArea(areaId);

  /** Pre-fills the brief from an area. Everything stays editable; "Other" clears back to generic. */
  const chooseArea = (id: string) => {
    setAreaId(id);
    const a = getArea(id);
    if (!a) { setSchemaType(''); setPicked(null); return; }
    setActivity(a.activity);
    setGoal(a.goal);
    setAtmosphere(a.atmosphere);
    setSchemaType(a.schemaType);
    setPicked(new Set(a.sections));
  };

  const toggle = (type: SectionType) => {
    const next = new Set(structure);
    if (next.has(type)) next.delete(type); else next.add(type);
    setPicked(next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('A website name is required.'); return; }
    const checked = projectMetaSchema.safeParse(meta);
    if (!checked.success) {
      const issue = checked.error.issues[0];
      setError(`${String(issue.path[0] ?? 'brief')}: ${issue.message}`);
      return;
    }
    const sections = SECTION_TYPES.filter((t) => structure.has(t));
    if (sections.length === 0) { setError('Choose at least one section.'); return; }
    onCreate(generateProject({ name: name.trim(), owner: 'local', meta: checked.data, presetId: chosen, motionIntensity: motion, sections, headings: area?.headings }, createRandomIds(), new Date().toISOString()));
  };

  return (
    <form className="wz" onSubmit={submit} noValidate>
      <h1>New website</h1>
      <p className="ed-hint">Any kind of website: a business, a portfolio, an event, a community, a product, a publication. Only the name is required; everything else helps.</p>
      <section>
        <h2>1. Project</h2>
        <Select label="Area (optional starting point)" value={areaId}
          options={[{ value: '', label: 'Other / custom: start from scratch' }, ...AREAS.map((a) => ({ value: a.id, label: a.label }))]}
          onChange={chooseArea} />
        {area && <p className="ed-hint">Pre-filled for {area.label.toLowerCase()}: objective, atmosphere, sections and headings. Change anything below.</p>}
        <div className="wz-grid">
          <TextInput label="Website name" value={name} onChange={setName} />
          <TextInput label="Activity or field (optional)" value={activity} onChange={setActivity} placeholder="Whatever describes it best" />
          <Select label="Main objective" value={goal} options={GOALS.map((v) => ({ value: v, label: label(v) }))} onChange={setGoal} />
          <TextInput label="Objective in your words" value={objective} onChange={setObjective} />
          <TextInput label="Target audience" value={audience} onChange={setAudience} />
          <TextInput label="Location (optional)" value={location} onChange={setLocation} />
          <TextInput label="Languages (codes, first is main)" value={languages} onChange={setLanguages} placeholder="en, fr" />
          <TextInput label="Public website address (optional)" value={siteUrl} onChange={setSiteUrl} placeholder="https://www.example.com" />
        </div>
        <TextInput label="Purpose of the website" value={purpose} multiline onChange={setPurpose} />
        <TextInput label="Description of the project, organisation or person" value={description} multiline onChange={setDescription} />
      </section>
      <section>
        <h2>2. Creative direction</h2>
        <div className="wz-grid">
          <Select label="Atmosphere" value={atmosphere} options={ATMOSPHERES.map((v) => ({ value: v, label: label(v) }))} onChange={setAtmosphere} />
          <TextInput label="Preferred colours" value={colors} onChange={setColors} placeholder="e.g. dark with gold, or soft greens" />
          <TextInput label="Typography preferences" value={typography} onChange={setTypography} />
          <TextInput label="Image and video direction" value={imagery} onChange={setImagery} />
          <TextInput label="Layout preferences" value={layout} onChange={setLayout} />
          <TextInput label="Animation and interaction preferences" value={motionPrefs} onChange={setMotionPrefs} />
        </div>
        <TextInput label="Design references (sites, images, ideas)" value={references} multiline onChange={setReferences} />
        <TextInput label="Describe the website freely" value={brief} multiline onChange={setBrief} />
      </section>
      <section>
        <h2>3. Functionality</h2>
        <TextInput label="What should the site do? (optional, in your words)" value={features} multiline onChange={setFeatures}
          placeholder={area ? `e.g. ${area.featuresHint}` : 'e.g. a contact form, a searchable list, a video, a sign-up for updates'} />
        <TextInput label="Technical requirements (optional)" value={technical} multiline onChange={setTechnical}
          placeholder="e.g. hosting, integrations, framework preferences" />
        <p className="ed-hint">Dynaweb builds forms, galleries, video and animation today. Other requests are kept in the brief for the AI assistant and listed as needing an integration.</p>
      </section>
      <section>
        <h2>4. Structure</h2>
        <p className="ed-hint">Suggested from your objective and your words. Tick exactly the sections you want; you can add, remove and reorder everything later.</p>
        <div className="wz-structure" role="group" aria-label="Sections">
          {SECTION_TYPES.map((t) => (
            <label key={t} className="ed-toggle">
              <input type="checkbox" checked={structure.has(t)} onChange={() => toggle(t)} />
              <span>{SECTION_LABELS[t]}</span>
            </label>
          ))}
        </div>
        {picked && <button type="button" onClick={() => setPicked(null)}>Back to the suggestion</button>}
      </section>
      <section>
        <h2>5. Art direction</h2>
        {proposals[0] && (
          <div className="wz-direction">
            <p><b>Layout.</b> {layout.trim() || proposals[0].layout}</p>
            <p><b>Imagery.</b> {proposals[0].imagery}</p>
            <p><b>Spacing.</b> {proposals[0].spacing}</p>
            <p><b>Motion.</b> {motionPrefs.trim() || proposals[0].interaction}</p>
          </div>
        )}
        <p className="ed-hint">Three visual identities that fit this direction. Every choice stays editable.</p>
        <div className="wz-proposals" role="radiogroup" aria-label="Design proposals">
          {proposals.map((p) => {
            const preset = PRESETS.find((x) => x.presetId === p.presetId)!;
            const on = chosen === p.presetId;
            return (
              <button key={p.presetId} type="button" role="radio" aria-checked={on} className={`wz-proposal${on ? ' is-on' : ''}`} onClick={() => setPresetId(p.presetId)}>
                <span className="ed-swatches">{[preset.colors.bg, preset.colors.surface, preset.colors.accent, preset.colors.text].map((c) => <i key={c} style={{ background: c }} />)}</span>
                <strong>{p.name}</strong>
                <span className="wz-character">{p.character}</span>
                <span>{p.rationale}</span>
              </button>
            );
          })}
        </div>
        <Select label="Or pick any preset" value={chosen} options={PRESETS.map((p) => ({ value: p.presetId, label: p.name }))} onChange={setPresetId} />
        <fieldset className="wz-motion">
          <legend>Animation intensity</legend>
          {(['None', 'Subtle', 'Expressive'] as const).map((text, i) => (
            <label key={text}><input type="radio" name="motion" checked={motion === i} onChange={() => setMotion(i as 0 | 1 | 2)} /> {text}</label>
          ))}
        </fieldset>
        <p className="ed-hint">{proposals[0]?.responsive}</p>
      </section>
      {error && <p className="ed-error" role="alert">{error}</p>}
      <div className="ed-row">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="ed-primary">6. Generate and open in editor</button>
      </div>
    </form>
  );
}
