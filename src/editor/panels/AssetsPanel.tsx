import { useRef, useState } from 'react';
import type { Asset } from '../../assets/assets';

interface Props {
  assets: Asset[];
  usedIds: Set<string>;
  onUpload: (files: File[]) => Promise<string[]>;
  onDelete: (id: string) => Promise<void>;
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

/** Upload and manage the images of this project. They stay in this browser and in saved project files. */
export function AssetsPanel({ assets, usedIds, onUpload, onDelete }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const errors = await onUpload(Array.from(files));
    setBusy(false);
    setMessage(errors.length ? errors.join(' ') : `${files.length} image(s) added. Pick them in any image field.`);
    if (input.current) input.current.value = '';
  };

  const remove = async (asset: Asset) => {
    const used = usedIds.has(asset.id);
    if (!window.confirm(used
      ? `"${asset.name}" is used on the page. Delete it anyway? Those places will show an image placeholder.`
      : `Delete "${asset.name}"? This cannot be undone.`)) return;
    await onDelete(asset.id);
  };

  return (
    <div className="ed-stack ed-assets">
      <button type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Adding...' : 'Upload images'}</button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
      {message && <p className="ed-hint" role="status">{message}</p>}
      {assets.length === 0 && <p className="ed-hint">JPEG, PNG, WebP or GIF up to 15 MB. Large images are kept sharp up to 2560 px.</p>}
      <ul className="ed-asset-grid">
        {assets.map((a) => (
          <li key={a.id} title={`${a.name}, ${a.width}x${a.height}, ${kb(a.bytes)}`}>
            <img src={a.dataUrl} alt={a.name} />
            <span className="ed-asset-name">{a.name}</span>
            <span className="ed-hint">{a.width}x{a.height} · {kb(a.bytes)}{usedIds.has(a.id) ? ' · in use' : ''}</span>
            <button type="button" className="ed-danger" aria-label={`Delete ${a.name}`} onClick={() => remove(a)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
