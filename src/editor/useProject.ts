import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyCommand } from '../model/commands';
import type { Command } from '../model/commands';
import type { Project } from '../model/schema';
import { createRandomIds } from '../model/ids';
import type { ProjectStore } from '../storage/projectStore';

const HISTORY_LIMIT = 100;
const AUTOSAVE_MS = 600;

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

interface History { past: Project[]; present: Project; future: Project[] }

/** Editor state: the current project, undo/redo history, command dispatch and autosave. */
export function useProject(initial: Project, store: ProjectStore) {
  const ids = useMemo(() => createRandomIds(), []);
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastError, setLastError] = useState<string | null>(null);
  const first = useRef(true);

  const dispatch = useCallback((cmd: Command): boolean => {
    let ok = true;
    setHistory((h) => {
      const result = applyCommand(h.present, cmd, ids);
      if (!result.ok) {
        ok = false;
        setLastError(result.error);
        return h;
      }
      setLastError(null);
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: result.project, future: [] };
    });
    return ok;
  }, [ids]);

  /**
   * Applies several commands as ONE history entry (one Undo reverts them all).
   * Returns the errors of commands that could not be applied; the rest still apply.
   */
  const applyMany = useCallback((cmds: Command[]): string[] => {
    const errors: string[] = [];
    let next = history.present;
    for (const cmd of cmds) {
      const result = applyCommand(next, cmd, ids);
      if (result.ok) next = result.project;
      else errors.push(result.error);
    }
    if (next !== history.present) {
      const before = history.present;
      setHistory((h) => (h.present === before ? { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] } : h));
    }
    return errors;
  }, [history.present, ids]);

  const undo = useCallback(() => setHistory((h) => (h.past.length
    ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    : h)), []);
  const redo = useCallback(() => setHistory((h) => (h.future.length
    ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    : h)), []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus('unsaved');
    const timer = window.setTimeout(() => {
      setStatus('saving');
      try {
        store.save(history.present);
        setStatus('saved');
      } catch (err) {
        setStatus('error');
        setLastError(err instanceof Error ? err.message : 'save failed');
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [history.present, store]);

  return {
    project: history.present, dispatch, applyMany, undo, redo,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    status, lastError, clearError: () => setLastError(null),
  };
}
