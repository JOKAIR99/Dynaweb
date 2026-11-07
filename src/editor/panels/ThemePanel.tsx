import type { Command } from '../../model/commands';
import type { Theme } from '../../model/schema';
import { PRESETS } from '../../generator/presets';
import { ColorInput, Select, Slider, TextInput } from '../controls';

const COLOR_LABELS: Record<keyof Theme['colors'], string> = {
  bg: 'Page background', surface: 'Surface', text: 'Text', muted: 'Muted text', accent: 'Accent', accentText: 'Text on accent',
};

export function ThemePanel({ theme, dispatch }: { theme: Theme; dispatch: (c: Command) => void }) {
  const set = (patch: Extract<Command, { kind: 'updateTheme' }>['patch']) => dispatch({ kind: 'updateTheme', patch });
  return (
    <div className="ed-stack">
      <div className="ed-sub">Design presets</div>
      <div className="ed-presets">
        {PRESETS.map((p) => (
          <button key={p.presetId} type="button" className={`ed-preset${p.presetId === theme.presetId ? ' is-on' : ''}`}
            onClick={() => dispatch({ kind: 'replaceTheme', theme: { ...structuredClone(p), motion: theme.motion } })}>
            <span className="ed-swatches">{[p.colors.bg, p.colors.surface, p.colors.accent, p.colors.text].map((c) => <i key={c} style={{ background: c }} />)}</span>
            {p.name}
          </button>
        ))}
      </div>
      <div className="ed-sub">Typography</div>
      <TextInput label="Display font (Google Fonts family)" value={theme.fonts.display} onChange={(v) => set({ fonts: { display: v } })} />
      <TextInput label="Body font" value={theme.fonts.body} onChange={(v) => set({ fonts: { body: v } })} />
      <Slider label="Display weight" value={theme.fonts.displayWeight} min={100} max={900} step={100} onChange={(v) => set({ fonts: { displayWeight: v } })} />
      <Slider label="Type scale ratio" value={theme.scale} min={1.1} max={1.6} step={0.01} onChange={(v) => set({ scale: v })} />
      <p className="ed-hint">Changing a font name keeps the preset's font stylesheet; new families load in Phase 3.</p>
      <div className="ed-sub">Colours</div>
      {(Object.keys(COLOR_LABELS) as (keyof Theme['colors'])[]).map((k) => (
        <ColorInput key={k} label={COLOR_LABELS[k]} value={theme.colors[k]} onChange={(v) => set({ colors: { [k]: v } })} />
      ))}
      <div className="ed-sub">Shape and motion</div>
      <Slider label="Corner radius" value={theme.radius} min={0} max={40} unit="px" onChange={(v) => set({ radius: v })} />
      <Select label="Motion level" value={theme.motion} options={[{ value: 'none', label: 'None (all animations off)' }, { value: 'subtle', label: 'Subtle' }, { value: 'expressive', label: 'Expressive' }]} onChange={(v) => set({ motion: v })} />
    </div>
  );
}
