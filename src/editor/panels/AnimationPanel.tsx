import type { Command } from '../../model/commands';
import type { Animation, AnimationType, HorizontalSettings, ParallaxSettings, RevealSettings, Section } from '../../model/schema';
import { revealEffectSchema } from '../../model/schema';
import { Select, Slider, TextInput, Toggle } from '../controls';

interface Props {
  pageId: string;
  section: Section;
  dispatch: (c: Command) => void;
  onReplay: () => void;
  newLayerId: () => string;
}

const TITLES: Record<AnimationType, string> = {
  parallax: 'Parallax: 3D depth',
  reveal: 'Scroll reveal',
  horizontal: 'Horizontal scroll',
};

export function AnimationPanel({ pageId, section, dispatch, onReplay, newLayerId }: Props) {
  const base = { pageId, sectionId: section.id };
  const present = new Set(section.animations.map((a) => a.type));
  const blocked = (t: AnimationType) => present.has(t)
    || (t === 'parallax' && present.has('horizontal'))
    || (t === 'horizontal' && present.has('parallax'))
    || (t === 'horizontal' && section.type !== 'gallery');

  return (
    <div className="ed-stack">
      <div className="ed-row ed-wrap">
        {(['parallax', 'reveal', 'horizontal'] as const).map((t) => (
          <button key={t} type="button" disabled={blocked(t)} onClick={() => dispatch({ kind: 'addAnimation', ...base, animationType: t })}
            title={t === 'horizontal' && section.type !== 'gallery' ? 'Horizontal scroll applies to gallery sections' : undefined}>
            + {TITLES[t]}
          </button>
        ))}
      </div>
      {section.animations.length === 0 && <p className="ed-empty">No animation on this section yet.</p>}
      {section.animations.map((anim) => (
        <fieldset key={anim.id} className="ed-anim">
          <legend>{TITLES[anim.type]}</legend>
          <div className="ed-row">
            <Toggle label="Enabled" value={anim.enabled} onChange={(v) => dispatch({ kind: 'updateAnimation', ...base, animationId: anim.id, enabled: v })} />
            <button type="button" onClick={onReplay}>Replay preview</button>
            <button type="button" className="ed-danger" onClick={() => dispatch({ kind: 'removeAnimation', ...base, animationId: anim.id })}>Remove</button>
          </div>
          <AnimationSettings anim={anim} set={(settings) => dispatch({ kind: 'updateAnimation', ...base, animationId: anim.id, settings })} newLayerId={newLayerId} />
        </fieldset>
      ))}
    </div>
  );
}

type Set = (s: Record<string, unknown>) => void;

function AnimationSettings({ anim, set, newLayerId }: { anim: Animation; set: Set; newLayerId: () => string }) {
  switch (anim.type) {
    case 'parallax': return <ParallaxDesigner s={anim.settings} set={set} newLayerId={newLayerId} />;
    case 'reveal': return <RevealDesigner s={anim.settings} set={set} />;
    case 'horizontal': return <HorizontalDesigner s={anim.settings} set={set} />;
  }
}

const DEFAULT_PARALLAX_RESET = { speed: 0.35, depth: 0.6, direction: 'vertical', mouseInteraction: false, mouseStrength: 0.3, scale: 1.1, perspective: 0 };

function ParallaxDesigner({ s, set, newLayerId }: { s: ParallaxSettings; set: Set; newLayerId: () => string }) {
  const setLayer = (id: string, patch: Record<string, unknown>) => set({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  return (
    <div className="ed-stack">
      <Slider label="Background speed" value={s.speed} min={-1} max={1} step={0.05} onChange={(v) => set({ speed: v })} />
      <Slider label="Depth intensity" value={s.depth} min={0} max={1} step={0.05} onChange={(v) => set({ depth: v })} />
      <Select label="Direction" value={s.direction} options={['vertical', 'horizontal', 'both'] as const} onChange={(v) => set({ direction: v })} />
      <Slider label="Layer scale" value={s.scale} min={1} max={1.5} step={0.01} onChange={(v) => set({ scale: v })} />
      <Slider label="Perspective" value={s.perspective} min={0} max={3000} step={50} unit="px" onChange={(v) => set({ perspective: v })} />
      <Toggle label="Follow the mouse" value={s.mouseInteraction} onChange={(v) => set({ mouseInteraction: v })} />
      {s.mouseInteraction && <Slider label="Mouse strength" value={s.mouseStrength} min={0} max={1} step={0.05} onChange={(v) => set({ mouseStrength: v })} />}
      <div className="ed-sub">Extra layers (background image is set in Content)</div>
      {s.layers.map((l, i) => (
        <div key={l.id} className="ed-layer">
          <div className="ed-row">
            <strong>Layer {i + 1}</strong>
            <button type="button" disabled={i === 0} onClick={() => { const a = [...s.layers]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ layers: a }); }} aria-label="Move layer up">Up</button>
            <button type="button" className="ed-danger" onClick={() => set({ layers: s.layers.filter((x) => x.id !== l.id) })}>Remove</button>
          </div>
          <Select label="Role" value={l.role} options={['background', 'midground', 'foreground'] as const} onChange={(v) => setLayer(l.id, { role: v })} />
          <TextInput label="Image URL (https)" value={l.imageUrl} onChange={(v) => setLayer(l.id, { imageUrl: v })} />
          <Slider label="Speed" value={l.speed} min={-1} max={1} step={0.05} onChange={(v) => setLayer(l.id, { speed: v })} />
          <Slider label="Opacity" value={l.opacity} min={0} max={1} step={0.05} onChange={(v) => setLayer(l.id, { opacity: v })} />
        </div>
      ))}
      <div className="ed-row">
        <button type="button" disabled={s.layers.length >= 6}
          onClick={() => set({ layers: [...s.layers, { id: newLayerId(), role: 'foreground', imageUrl: '', speed: -0.2, opacity: 1 }] })}>+ Add layer</button>
        <button type="button" onClick={() => set(DEFAULT_PARALLAX_RESET)}>Reset</button>
      </div>
    </div>
  );
}

function RevealDesigner({ s, set }: { s: RevealSettings; set: Set }) {
  return (
    <div className="ed-stack">
      <Select label="Effect" value={s.effect} options={revealEffectSchema.options} onChange={(v) => set({ effect: v })} />
      <Select label="Apply to" value={s.target} options={['section', 'children', 'headings', 'images', 'buttons', 'cards'] as const} onChange={(v) => set({ target: v })} />
      <Slider label="Duration" value={s.duration} min={100} max={4000} step={50} unit="ms" onChange={(v) => set({ duration: v })} />
      <Slider label="Delay" value={s.delay} min={0} max={4000} step={50} unit="ms" onChange={(v) => set({ delay: v })} />
      <Slider label="Stagger" value={s.stagger} min={0} max={1000} step={10} unit="ms" onChange={(v) => set({ stagger: v })} />
      <Select label="Easing" value={s.easing} options={['linear', 'ease', 'ease-out', 'ease-in-out', 'expo-out', 'back-out'] as const} onChange={(v) => set({ easing: v })} />
      <Slider label="Distance" value={s.distance} min={0} max={400} unit="px" onChange={(v) => set({ distance: v })} />
      <Slider label="Initial opacity" value={s.initialOpacity} min={0} max={1} step={0.05} onChange={(v) => set({ initialOpacity: v })} />
      <Slider label="Initial scale" value={s.initialScale} min={0.5} max={1.5} step={0.01} onChange={(v) => set({ initialScale: v })} />
      <Slider label="Rotation" value={s.rotation} min={-180} max={180} unit="deg" onChange={(v) => set({ rotation: v })} />
      <Slider label="Trigger threshold" value={s.threshold} min={0} max={1} step={0.05} onChange={(v) => set({ threshold: v })} />
      <Toggle label="Play once (off = replay on scroll)" value={s.once} onChange={(v) => set({ once: v })} />
      <RevealTimeline s={s} />
    </div>
  );
}

/** Visual timeline: one bar per staggered element, showing delay and duration. */
function RevealTimeline({ s }: { s: RevealSettings }) {
  const rows = 4;
  const total = s.delay + (rows - 1) * s.stagger + s.duration;
  return (
    <div className="ed-timeline" aria-label="Animation timeline">
      {Array.from({ length: rows }, (_, i) => {
        const start = s.delay + i * s.stagger;
        return <div key={i} className="ed-tl-row"><span style={{ marginLeft: `${(start / total) * 100}%`, width: `${(s.duration / total) * 100}%` }} /></div>;
      })}
      <div className="ed-hint">{total} ms for the first four elements</div>
    </div>
  );
}

function HorizontalDesigner({ s, set }: { s: HorizontalSettings; set: Set }) {
  return (
    <div className="ed-stack">
      <Slider label="Panel width" value={s.panelWidth} min={30} max={100} unit="vw" onChange={(v) => set({ panelWidth: v })} />
      <Slider label="Gap" value={s.gap} min={0} max={200} unit="px" onChange={(v) => set({ gap: v })} />
      <Slider label="Scroll speed" value={s.speed} min={0.25} max={3} step={0.05} onChange={(v) => set({ speed: v })} />
      <Select label="Direction" value={s.direction} options={[{ value: 'ltr', label: 'Left to right' }, { value: 'rtl', label: 'Right to left' }]} onChange={(v) => set({ direction: v })} />
      <Toggle label="Snap to panels" value={s.snap} onChange={(v) => set({ snap: v })} />
      <Toggle label="Progress bar" value={s.showProgress} onChange={(v) => set({ showProgress: v })} />
      <Toggle label="Panel indicators" value={s.showIndicators} onChange={(v) => set({ showIndicators: v })} />
      <Select label="On mobile" value={s.mobileLayout} options={[{ value: 'vertical', label: 'Stack vertically' }, { value: 'swipe', label: 'Swipe carousel' }]} onChange={(v) => set({ mobileLayout: v })} />
      <p className="ed-hint">Panels come from the gallery items (Content tab). The section is pinned while it scrolls sideways.</p>
    </div>
  );
}
