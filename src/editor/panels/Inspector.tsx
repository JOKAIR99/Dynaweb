import type { Command } from '../../model/commands';
import type { Section, SectionStyle } from '../../model/schema';
import { Select, Slider, TextInput, Toggle } from '../controls';

interface Props { pageId: string; section: Section; dispatch: (c: Command) => void }

export function ContentPanel({ pageId, section, dispatch }: Props) {
  const base = { pageId, sectionId: section.id };
  const c = section.content;
  const set = (patch: Partial<Section['content']>) => dispatch({ kind: 'updateContent', ...base, patch });
  const itemLabel = section.type === 'navigation' ? 'Link target (#anchor or https)' : 'Text';
  return (
    <div className="ed-stack">
      <TextInput label="Section name (editor only)" value={section.name} onChange={(v) => dispatch({ kind: 'renameSection', ...base, name: v || section.name })} />
      <TextInput label="Heading" value={c.heading} onChange={(v) => set({ heading: v })} />
      {section.type !== 'navigation' && <TextInput label="Subheading" value={c.subheading} multiline onChange={(v) => set({ subheading: v })} />}
      {['about', 'footer'].includes(section.type) && <TextInput label="Body" value={c.body} multiline onChange={(v) => set({ body: v })} />}
      {['hero', 'about'].includes(section.type) && (
        <TextInput label={section.type === 'hero' ? 'Background image URL (https)' : 'Image URL (https)'} value={c.imageUrl} onChange={(v) => set({ imageUrl: v })} />
      )}
      {['hero', 'about', 'cta'].includes(section.type) && (
        <>
          <TextInput label="Primary button label" value={c.primaryAction.label} onChange={(v) => set({ primaryAction: { ...c.primaryAction, label: v } })} />
          <TextInput label="Primary button link" value={c.primaryAction.href} onChange={(v) => set({ primaryAction: { ...c.primaryAction, href: v } })} />
          <TextInput label="Secondary button label (optional)" value={c.secondaryAction.label} onChange={(v) => set({ secondaryAction: { ...c.secondaryAction, label: v } })} />
          <TextInput label="Secondary button link" value={c.secondaryAction.href} onChange={(v) => set({ secondaryAction: { ...c.secondaryAction, href: v } })} />
        </>
      )}
      {['navigation', 'features', 'gallery'].includes(section.type) && (
        <div className="ed-stack">
          <div className="ed-sub">{section.type === 'gallery' ? 'Images / panels' : section.type === 'navigation' ? 'Links' : 'Items'}</div>
          {c.items.map((item, i) => (
            <div key={item.id} className="ed-layer">
              <div className="ed-row"><strong>#{i + 1}</strong>
                <button type="button" className="ed-danger" onClick={() => dispatch({ kind: 'removeItem', ...base, itemId: item.id })}>Remove</button>
              </div>
              <TextInput label="Title" value={item.title} onChange={(v) => dispatch({ kind: 'updateItem', ...base, itemId: item.id, patch: { title: v } })} />
              {section.type !== 'gallery' && <TextInput label={itemLabel} value={item.text} onChange={(v) => dispatch({ kind: 'updateItem', ...base, itemId: item.id, patch: { text: v } })} />}
              {section.type !== 'navigation' && <TextInput label="Image URL (https)" value={item.imageUrl} onChange={(v) => dispatch({ kind: 'updateItem', ...base, itemId: item.id, patch: { imageUrl: v } })} />}
            </div>
          ))}
          <button type="button" onClick={() => dispatch({ kind: 'addItem', ...base })}>+ Add</button>
        </div>
      )}
      <p className="ed-hint">Text in [brackets] is a placeholder. Replace it with real information before publishing.</p>
    </div>
  );
}

export function StylePanel({ pageId, section, dispatch }: Props) {
  const s = section.style;
  const set = (patch: Partial<SectionStyle>) => dispatch({ kind: 'updateStyle', pageId, sectionId: section.id, patch });
  return (
    <div className="ed-stack">
      <Select label="Background" value={s.background} options={[{ value: 'bg', label: 'Page' }, { value: 'surface', label: 'Surface' }, { value: 'accent', label: 'Accent' }, { value: 'text', label: 'Inverted' }]} onChange={(v) => set({ background: v })} />
      <Select label="Alignment" value={s.align} options={['start', 'center', 'end'] as const} onChange={(v) => set({ align: v })} />
      <Slider label="Vertical padding" value={s.paddingY} min={0} max={320} step={4} unit="px" onChange={(v) => set({ paddingY: v })} />
      <Slider label="Minimum height" value={s.minHeight} min={0} max={100} unit="vh" onChange={(v) => set({ minHeight: v })} />
      <Slider label="Content width" value={s.maxWidth} min={480} max={1600} step={20} unit="px" onChange={(v) => set({ maxWidth: v })} />
      <Slider label="Columns" value={s.columns} min={1} max={4} onChange={(v) => set({ columns: v })} />
      <div className="ed-sub">Visibility</div>
      <Toggle label="Hide on desktop" value={s.hidden.desktop} onChange={(v) => set({ hidden: { ...s.hidden, desktop: v } })} />
      <Toggle label="Hide on tablet" value={s.hidden.tablet} onChange={(v) => set({ hidden: { ...s.hidden, tablet: v } })} />
      <Toggle label="Hide on mobile" value={s.hidden.mobile} onChange={(v) => set({ hidden: { ...s.hidden, mobile: v } })} />
    </div>
  );
}
