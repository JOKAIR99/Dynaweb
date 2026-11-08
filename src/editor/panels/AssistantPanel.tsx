import { useState } from 'react';
import type { Command } from '../../model/commands';
import type { Project } from '../../model/schema';
import { SECTION_LABELS } from '../../model/defaults';

interface Proposal { raw: string; command: Command | null; ok: boolean; error?: string }
type AssistResponse =
  | { ok: true; summary: string; proposals: Proposal[]; missingFacts: string[]; needsIntegration: string[]; model: string }
  | { ok: false; error: string };

interface Props {
  project: Project;
  applyMany: (cmds: Command[]) => string[];
}

const KIND_LABELS: Record<Command['kind'], string> = {
  renameProject: 'Rename the project', updateMeta: 'Update the brief', addSection: 'Add a section', removeSection: 'Remove a section',
  duplicateSection: 'Duplicate a section', moveSection: 'Move a section', renameSection: 'Rename a section', updateContent: 'Edit content',
  updateItem: 'Edit an item', addItem: 'Add an item', removeItem: 'Remove an item', updateStyle: 'Change the style',
  addAnimation: 'Add an animation', removeAnimation: 'Remove an animation', updateAnimation: 'Adjust an animation',
  setElementAnimation: 'Animate an element', updateTheme: 'Adjust the theme', replaceTheme: 'Replace the theme',
};

/** "Edit content: Hero" style label, so the owner sees what each proposal touches. */
function describe(cmd: Command, project: Project): string {
  const base = KIND_LABELS[cmd.kind];
  if ('sectionType' in cmd) return `${base}: ${SECTION_LABELS[cmd.sectionType]}`;
  if ('sectionId' in cmd) {
    const section = project.pages.flatMap((p) => p.sections).find((s) => s.id === cmd.sectionId);
    return section ? `${base}: ${section.name}` : base;
  }
  return base;
}

/** The AI assistant: describe a change, review the validated proposals, apply them as one undo step. */
export function AssistantPanel({ project, applyMany }: Props) {
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    setNotice(null);
    setSkipped(new Set());
    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project, request }),
      });
      const json = (await res.json()) as AssistResponse;
      setResult(json.ok ? json : { ok: false, error: json.error || `The assistant returned an error (${res.status}).` });
    } catch {
      setResult({ ok: false, error: 'The assistant could not be reached. It runs with the dev server (npm run dev).' });
    } finally {
      setBusy(false);
    }
  };

  const accepted = result?.ok ? result.proposals.map((p, i) => ({ p, i })).filter(({ p, i }) => p.ok && p.command && !skipped.has(i)) : [];

  const apply = () => {
    const errors = applyMany(accepted.map(({ p }) => p.command as Command));
    setNotice(errors.length
      ? `Applied with ${errors.length} change(s) skipped because they depended on one you unticked: ${errors[0]}`
      : `Applied ${accepted.length} change(s). One Undo reverts them all.`);
    setResult(null);
    setRequest('');
  };

  const toggle = (i: number) => {
    const next = new Set(skipped);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSkipped(next);
  };

  return (
    <div className="ed-stack">
      <p className="ed-hint">Describe a change in your own words. The assistant proposes edits; nothing changes until you apply them.</p>
      <label className="ed-field">
        <span className="ed-label">Request</span>
        <textarea rows={4} maxLength={2000} value={request} onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. Make the hero more dramatic, add a section about our process, use a slower reveal on the cards" />
      </label>
      <div className="ed-row">
        <button type="button" className="ed-primary" disabled={busy || !request.trim()} onClick={send}>{busy ? 'Thinking...' : 'Ask the assistant'}</button>
      </div>
      {busy && <p className="ed-hint" role="status">Working on it. This can take up to a minute.</p>}
      {notice && <p className="ed-hint" role="status">{notice}</p>}

      {result && !result.ok && <p className="ed-error" role="alert">{result.error}</p>}

      {result?.ok && (
        <div className="ed-stack" aria-live="polite">
          <div className="ed-sub">Proposal</div>
          <p>{result.summary}</p>
          {result.proposals.length === 0 && <p className="ed-empty">No changes proposed.</p>}
          <ul className="ed-proposals">
            {result.proposals.map((p, i) => (
              <li key={i} className={p.ok ? '' : 'is-rejected'}>
                {p.ok && p.command ? (
                  <label className="ed-toggle">
                    <input type="checkbox" checked={!skipped.has(i)} onChange={() => toggle(i)} />
                    <span>{describe(p.command, project)}</span>
                  </label>
                ) : (
                  <span>Rejected: {p.error}</span>
                )}
                {p.raw && <details><summary>Details</summary><code>{p.raw}</code></details>}
              </li>
            ))}
          </ul>
          {result.missingFacts.length > 0 && (
            <>
              <div className="ed-sub">Facts you still need to provide</div>
              <ul>{result.missingFacts.map((f) => <li key={f}>{f}</li>)}</ul>
            </>
          )}
          {result.needsIntegration.length > 0 && (
            <>
              <div className="ed-sub">Needs an external service</div>
              <ul>{result.needsIntegration.map((f) => <li key={f}>{f}</li>)}</ul>
            </>
          )}
          <div className="ed-row">
            <button type="button" className="ed-primary" disabled={accepted.length === 0} onClick={apply}>Apply {accepted.length} change(s)</button>
            <button type="button" onClick={() => setResult(null)}>Discard</button>
          </div>
          <p className="ed-hint">Model: {result.model}</p>
        </div>
      )}
    </div>
  );
}
