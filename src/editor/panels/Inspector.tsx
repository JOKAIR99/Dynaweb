import type { Command } from '../../model/commands';
import type { Section, SectionStyle } from '../../model/schema';
import { SECTION_VARIANTS, VARIANT_LABELS } from '../../model/schema';
import { Select, Slider, TextInput, Toggle } from '../controls';

interface Props { pageId: string; section: Section; dispatch: (c: Command) => void }

type SectionType = Section['type'];
const ITEM_LABELS: Partial<Record<SectionType, string>> = {
  gallery: 'Images / panels', navigation: 'Links', testimonials: 'Testimonials', pricing: 'Options', services: 'Services',
  statistics: 'Figures', showcase: 'Products', team: 'People',
};
const ITEM_TITLE: Partial<Record<SectionType, string>> = {
  testimonials: 'Customer name', pricing: 'Option name', statistics: 'Figure (real and sourced)', showcase: 'Product name', team: 'Name',
};
const ITEM_TEXT: Partial<Record<SectionType, string>> = {
  testimonials: 'Quote', pricing: 'Price and what is included', statistics: 'What it measures', showcase: 'Description and price', team: 'Role',
};
const ITEM_SECTIONS: SectionType[] = ['navigation', 'features', 'services', 'gallery', 'testimonials', 'pricing', 'statistics', 'showcase', 'team', 'custom'];

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
      {['about', 'footer', 'contact', 'text', 'custom'].includes(section.type) && <TextInput label={section.type === 'contact' ? 'Contact details' : section.type === 'text' || section.type === 'custom' ? 'Text (blank line = new paragraph)' : 'Body'} value={c.body} multiline onChange={(v) => set({ body: v })} />}
      {section.type === 'contact' && (
        <>
          <Select label="Form type" value={c.formKind} options={[{ value: 'inquiry', label: 'Inquiry (name, email, message)' }, { value: 'booking', label: 'Booking request (adds date and guests)' }]} onChange={(v) => set({ formKind: v })} />
          <TextInput label="Form endpoint (https)" value={c.formEndpoint} placeholder="https://formspree.io/f/your-id" onChange={(v) => set({ formEndpoint: v.trim() })} />
          <p className="ed-hint">The form posts here: any service that accepts form POSTs, or your own API. Without an endpoint the published form says it is not connected; it never pretends to send.</p>
        </>
      )}
      {['hero', 'about', 'media', 'custom'].includes(section.type) && (
        <TextInput label={section.type === 'hero' ? 'Background image URL (https)' : section.type === 'media' ? 'Image URL, or video poster (https)' : 'Image URL (https)'} value={c.imageUrl} onChange={(v) => set({ imageUrl: v })} />
      )}
      {['media', 'custom'].includes(section.type) && (
        <>
          <TextInput label="Video (https .mp4/.webm, YouTube or Vimeo link)" value={c.videoUrl} onChange={(v) => set({ videoUrl: v.trim() })} />
          <p className="ed-hint">YouTube plays from youtube-nocookie.com and Vimeo with do-not-track. Other links are ignored for safety.</p>
        </>
      )}
      {['hero', 'about', 'cta', 'pricing', 'showcase', 'text', 'custom'].includes(section.type) && (
        <>
          <TextInput label="Primary button label" value={c.primaryAction.label} onChange={(v) => set({ primaryAction: { ...c.primaryAction, label: v } })} />
          <TextInput label="Primary button link" value={c.primaryAction.href} onChange={(v) => set({ primaryAction: { ...c.primaryAction, href: v } })} />
          <TextInput label="Secondary button label (optional)" value={c.secondaryAction.label} onChange={(v) => set({ secondaryAction: { ...c.secondaryAction, label: v } })} />
          <TextInput label="Secondary button link" value={c.secondaryAction.href} onChange={(v) => set({ secondaryAction: { ...c.secondaryAction, href: v } })} />
        </>
      )}
      {ITEM_SECTIONS.includes(section.type) && (
        <div className="ed-stack">
          <div className="ed-sub">{ITEM_LABELS[section.type] ?? 'Items'}</div>
          {section.type === 'testimonials' && <p className="ed-hint">Publish only real reviews, with the customer's permission.</p>}
          {section.type === 'statistics' && <p className="ed-hint">Only publish figures you can back up, such as "12 years" or "4,000 guests in 2025".</p>}
          {section.type === 'team' && <p className="ed-hint">Use real names and photos only with each person's agreement.</p>}
          {c.items.map((item, i) => (
            <div key={item.id} className="ed-layer">
              <div className="ed-row"><strong>#{i + 1}</strong>
                <button type="button" className="ed-danger" onClick={() => dispatch({ kind: 'removeItem', ...base, itemId: item.id })}>Remove</button>
              </div>
              <TextInput label={ITEM_TITLE[section.type] ?? 'Title'} value={item.title} onChange={(v) => dispatch({ kind: 'updateItem', ...base, itemId: item.id, patch: { title: v } })} />
              {section.type !== 'gallery' && <TextInput label={ITEM_TEXT[section.type] ?? itemLabel} value={item.text} onChange={(v) => dispatch({ kind: 'updateItem', ...base, itemId: item.id, patch: { text: v } })} />}
              {!['navigation', 'testimonials', 'pricing', 'statistics'].includes(section.type) && <TextInput label="Image URL (https)" value={item.imageUrl} onChange={(v) => dispatch({ kind: 'updateItem', ...base, itemId: item.id, patch: { imageUrl: v } })} />}
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
  const variants = SECTION_VARIANTS[section.type] as readonly string[];
  const horizontal = section.animations.some((a) => a.type === 'horizontal' && a.enabled);
  return (
    <div className="ed-stack">
      <div className="ed-field" role="group" aria-label="Layout">
        <span className="ed-label">Layout</span>
        <div className="ed-row ed-wrap">
          {variants.map((v) => (
            <button key={v} type="button" aria-pressed={s.variant === v} onClick={() => set({ variant: v })}>{VARIANT_LABELS[v] ?? v}</button>
          ))}
        </div>
        {horizontal && <span className="ed-hint">Horizontal scroll is on, so it controls this gallery's layout on larger screens.</span>}
      </div>
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
