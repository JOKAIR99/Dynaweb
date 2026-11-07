import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Project } from '../model/schema';
import { createRandomIds } from '../model/ids';
import { generateProject } from '../generator/generate';
import { PRESETS } from '../generator/presets';
import { TextInput } from './controls';

interface Props { onCreate: (p: Project) => void; onCancel: () => void }

/** Steps 1 to 4 of the creation flow: project facts, brief, design direction, generation. */
export function CreateWizard({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');
  const [audience, setAudience] = useState('');
  const [language, setLanguage] = useState('en');
  const [objective, setObjective] = useState('');
  const [brief, setBrief] = useState('');
  const [presetId, setPresetId] = useState(PRESETS[0].presetId);
  const [motion, setMotion] = useState<0 | 1 | 2>(2);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('A website name is required.'); return; }
    if (!/^[a-z]{2,3}(-[A-Za-z]{2})?$/.test(language)) { setError('Language must be a code such as en, fr or th.'); return; }
    const project = generateProject({
      name: name.trim(), owner: 'local',
      meta: { businessType, industry, audience, language, objective, brief },
      presetId, motionIntensity: motion,
    }, createRandomIds(), new Date().toISOString());
    onCreate(project);
  };

  return (
    <form className="wz" onSubmit={submit}>
      <h1>New website</h1>
      <section>
        <h2>1. The project</h2>
        <div className="wz-grid">
          <TextInput label="Website name" value={name} onChange={setName} />
          <TextInput label="Business type" value={businessType} onChange={setBusinessType} placeholder="Private boat tours" />
          <TextInput label="Industry" value={industry} onChange={setIndustry} placeholder="Tourism" />
          <TextInput label="Target audience" value={audience} onChange={setAudience} />
          <TextInput label="Language code" value={language} onChange={setLanguage} />
          <TextInput label="Website objective" value={objective} onChange={setObjective} placeholder="Get booking requests" />
        </div>
      </section>
      <section>
        <h2>2. Design brief</h2>
        <TextInput label="Describe the website" value={brief} multiline onChange={setBrief}
          placeholder="A premium private boat tour website in Thailand: cinematic hero, parallax backgrounds, scroll-revealed content and a horizontal gallery." />
        <p className="ed-hint">Words like parallax, cinematic, horizontal or gallery switch on the matching animations. AI-written briefs arrive in Phase 5.</p>
      </section>
      <section>
        <h2>3. Design direction</h2>
        <div className="ed-presets">
          {PRESETS.map((p) => (
            <button key={p.presetId} type="button" aria-pressed={presetId === p.presetId} className={`ed-preset${presetId === p.presetId ? ' is-on' : ''}`} onClick={() => setPresetId(p.presetId)}>
              <span className="ed-swatches">{[p.colors.bg, p.colors.surface, p.colors.accent, p.colors.text].map((c) => <i key={c} style={{ background: c }} />)}</span>
              {p.name} <small>{p.fonts.display} / {p.fonts.body}</small>
            </button>
          ))}
        </div>
        <fieldset className="wz-motion">
          <legend>Animation intensity</legend>
          {(['None', 'Subtle', 'Expressive'] as const).map((label, i) => (
            <label key={label}><input type="radio" name="motion" checked={motion === i} onChange={() => setMotion(i as 0 | 1 | 2)} /> {label}</label>
          ))}
        </fieldset>
      </section>
      {error && <p className="ed-error" role="alert">{error}</p>}
      <div className="ed-row">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="ed-primary">4. Generate and open in editor</button>
      </div>
    </form>
  );
}
