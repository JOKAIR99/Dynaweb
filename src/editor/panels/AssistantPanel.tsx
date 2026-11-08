import { useMemo, useState } from 'react';
import type { Command } from '../../model/commands';
import type { Project } from '../../model/schema';
import { SECTION_LABELS } from '../../model/defaults';
import { createRandomIds } from '../../model/ids';
import { MAX_REQUEST_CHARS, buildChatPrompt, parseAssistAnswer, validateProposals } from '../../ai/proposals';
import type { Proposal } from '../../ai/proposals';

type Result =
  | { ok: true; summary: string; proposals: Proposal[]; missingFacts: string[]; needsIntegration: string[]; source: string }
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

/**
 * The AI assistant. Default: use your own Claude chat, no API key. Dynaweb
 * writes the prompt, you paste Claude's answer back, and every proposed change
 * is validated before you can apply it. Optional: a server with an API key.
 */
export function AssistantPanel({ project, applyMany }: Props) {
  const ids = useMemo(() => createRandomIds(), []);
  const [request, setRequest] = useState('');
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => { setResult(null); setNotice(null); setSkipped(new Set()); };

  const copyPrompt = async () => {
    reset();
    const prompt = buildChatPrompt(project, request);
    try {
      await navigator.clipboard.writeText(prompt);
      setManualPrompt(null);
      setCopied('Copied. Paste it into your Claude chat (claude.ai or the Claude app), then paste Claude\'s whole answer below.');
    } catch {
      // Clipboard blocked: show the prompt so it can be selected and copied by hand.
      setManualPrompt(prompt);
      setCopied('Your browser blocked the clipboard. Select the prompt below, copy it, and paste it into your Claude chat.');
    }
  };

  const checkAnswer = () => {
    reset();
    const parsed = parseAssistAnswer(answer);
    if (!parsed.ok) { setResult({ ok: false, error: parsed.error }); return; }
    const o = parsed.output;
    setResult({ ok: true, summary: o.summary, proposals: validateProposals(project, o.commands, ids), missingFacts: o.missingFacts, needsIntegration: o.needsIntegration, source: 'your Claude chat' });
  };

  const askServer = async () => {
    reset();
    setBusy(true);
    try {
      const res = await fetch('/api/assist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project, request }) });
      const json = await res.json();
      setResult(json.ok
        ? { ok: true, summary: json.summary, proposals: json.proposals, missingFacts: json.missingFacts, needsIntegration: json.needsIntegration, source: json.model }
        : { ok: false, error: json.error || `The assistant returned an error (${res.status}).` });
    } catch {
      setResult({ ok: false, error: 'The server assistant could not be reached. It runs with the dev server (npm run dev).' });
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
    setAnswer('');
    setCopied(null);
    setManualPrompt(null);
  };

  const toggle = (i: number) => {
    const next = new Set(skipped);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSkipped(next);
  };

  return (
    <div className="ed-stack">
      <p className="ed-hint">Use your own Claude chat: no API key, no extra cost in Dynaweb. Nothing changes until you apply.</p>

      <div className="ed-sub">1. Describe the change</div>
      <textarea aria-label="Request" rows={4} maxLength={MAX_REQUEST_CHARS} value={request} onChange={(e) => setRequest(e.target.value)}
        placeholder="e.g. Make the hero more dramatic, add a section about our process, use a slower reveal on the cards" />
      <div className="ed-row">
        <button type="button" className="ed-primary" disabled={!request.trim()} onClick={copyPrompt}>Copy prompt for Claude</button>
      </div>
      {copied && <p className="ed-hint" role="status">{copied}</p>}
      {manualPrompt && <textarea aria-label="Prompt to copy" readOnly rows={6} value={manualPrompt} onFocus={(e) => e.currentTarget.select()} />}

      <div className="ed-sub">2. Paste Claude's answer</div>
      <textarea aria-label="Claude's answer" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Paste the whole reply here" />
      <div className="ed-row">
        <button type="button" className="ed-primary" disabled={!answer.trim()} onClick={checkAnswer}>Check answer</button>
      </div>

      <details className="ed-optional">
        <summary>Optional: use an API key on the server instead</summary>
        <p className="ed-hint">Only if you set ANTHROPIC_API_KEY where the dev server runs. Each request is billed to that account.</p>
        <button type="button" disabled={busy || !request.trim()} onClick={askServer}>{busy ? 'Thinking...' : 'Ask the server assistant'}</button>
      </details>

      {notice && <p className="ed-hint" role="status">{notice}</p>}
      {result && !result.ok && <p className="ed-error" role="alert">{result.error}</p>}

      {result?.ok && (
        <div className="ed-stack" aria-live="polite">
          <div className="ed-sub">3. Review and apply</div>
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
          <p className="ed-hint">Source: {result.source}</p>
        </div>
      )}
    </div>
  );
}
