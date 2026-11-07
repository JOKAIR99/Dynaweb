import type { ReactNode } from 'react';

interface FieldProps { label: string; children: ReactNode; hint?: string }

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="ed-field">
      <span className="ed-label">{label}</span>
      {children}
      {hint && <span className="ed-hint">{hint}</span>}
    </label>
  );
}

interface TextProps { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }

export function TextInput({ label, value, onChange, multiline, placeholder }: TextProps) {
  return (
    <Field label={label}>
      {multiline
        ? <textarea value={value} rows={3} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

interface SliderProps { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }

export function Slider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <Field label={label}>
      <div className="ed-slider">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
        <input type="number" min={min} max={max} step={step} value={value} aria-label={`${label} value`}
          onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n))); }} />
        <span className="ed-unit">{unit}</span>
      </div>
    </Field>
  );
}

interface SelectProps<T extends string> { label: string; value: T; options: readonly T[] | { value: T; label: string }[]; onChange: (v: T) => void }

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const opts = (options as readonly (T | { value: T; label: string })[]).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ed-toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="ed-color">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <input type="text" value={value} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && onChange(e.target.value)} aria-label={`${label} hex`} />
      </div>
    </Field>
  );
}
