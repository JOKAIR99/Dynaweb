import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Atmosphere, Goal, Project, ProjectMeta, Sector } from '../model/schema';
import { ATMOSPHERES, GOALS, SECTORS, projectMetaSchema } from '../model/schema';
import { createRandomIds } from '../model/ids';
import { generateProject, planSections } from '../generator/generate';
import { proposeDirections } from '../generator/direction';
import { PRESETS } from '../generator/presets';
import { SECTION_LABELS } from '../model/defaults';
import { Select, TextInput } from './controls';

interface Props { onCreate: (p: Project) => void; onCancel: () => void }

const label = (v: string) => v[0].toUpperCase() + v.slice(1);

/** Creation flow: brief, art direction, generation. */
export function CreateWizard({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState<Sector>('tourism');
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('natural');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState<Goal>('bookings');
  const [objective, setObjective] = useState('');
  const [languages, setLanguages] = useState('en');
  const [references, setReferences] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [brief, setBrief] = useState('');
  const [presetId, setPresetId] = useState<string | null>(null);
  const [motion, setMotion] = useState<0 | 1 | 2>(2);
  const [error, setError] = useState<string | null>(null);

  const langList = languages.split(/[,\s]+/).map((l) => l.trim()).filter(Boolean);
  const meta: ProjectMeta = {
    businessType, industry: sector, sector, location, atmosphere, audience, goal, objective,
    language: langList[0] ?? 'en', languages: langList.length ? langList : ['en'], references, brief, siteUrl: siteUrl.trim(),
  };
  const proposals = useMemo(() => proposeDirections(meta, name, 3), [sector, atmosphere, goal, location, name]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = presetId ?? proposals[0]?.presetId ?? PRESETS[0].presetId;
  const structure = planSections(meta);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('A business name is required.'); return; }
    const checked = projectMetaSchema.safeParse(meta);
    if (!checked.success) {
      const issue = checked.error.issues[0];
      setError(`${String(issue.path[0] ?? 'brief')}: ${issue.message}`);
      return;
    }
    onCreate(generateProject({ name: name.trim(), owner: 'local', meta: checked.data, presetId: chosen, motionIntensity: motion }, createRandomIds(), new Date().toISOString()));
  };

  return (
    <form className="wz" onSubmit={submit} noValidate>
      <h1>New website</h1>
      <section>
        <h2>1. Project brief</h2>
        <div className="wz-grid">
          <TextInput label="Business name" value={name} onChange={setName} />
          <Select label="Sector" value={sector} options={SECTORS.map((v) => ({ value: v, label: label(v) }))} onChange={setSector} />
          <TextInput label="Business type" value={businessType} onChange={setBusinessType} placeholder="Private boat tours" />
          <TextInput label="Location" value={location} onChange={setLocation} placeholder="Krabi, Thailand" />
          <Select label="Visual atmosphere" value={atmosphere} options={ATMOSPHERES.map((v) => ({ value: v, label: label(v) }))} onChange={setAtmosphere} />
          <TextInput label="Target audience" value={audience} onChange={setAudience} placeholder="Couples and small groups, 30 to 60" />
          <Select label="Primary objective" value={goal} options={GOALS.map((v) => ({ value: v, label: label(v) }))} onChange={setGoal} />
          <TextInput label="Objective in your words" value={objective} onChange={setObjective} placeholder="Get booking requests for private tours" />
          <TextInput label="Languages (codes, first is main)" value={languages} onChange={setLanguages} placeholder="en, fr, th" />
          <TextInput label="Public website address (optional)" value={siteUrl} onChange={setSiteUrl} placeholder="https://www.example.com" />
        </div>
        <TextInput label="Visual references (sites, images, ideas)" value={references} multiline onChange={setReferences} />
      </section>
      <section>
        <h2>2. Creative brief</h2>
        <TextInput label="Describe the website" value={brief} multiline onChange={setBrief}
          placeholder="Cinematic hero, parallax backgrounds, scroll-revealed content and an immersive horizontal gallery." />
        <p className="ed-hint">Proposed structure: {structure.map((t) => SECTION_LABELS[t]).join(', ')}. You can change everything in the editor.</p>
      </section>
      <section>
        <h2>3. Art direction</h2>
        {proposals[0] && (
          <div className="wz-direction">
            <p><b>Layout.</b> {proposals[0].layout}</p>
            <p><b>Imagery.</b> {proposals[0].imagery}</p>
            <p><b>Spacing.</b> {proposals[0].spacing}</p>
            <p><b>Motion.</b> {proposals[0].interaction}</p>
          </div>
        )}
        <p className="ed-hint">Three visual identities that fit this direction:</p>
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
        <button type="submit" className="ed-primary">4. Generate and open in editor</button>
      </div>
    </form>
  );
}
