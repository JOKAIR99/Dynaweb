import { useEffect, useMemo, useRef, useState } from 'react';
import runtimeJs from '../runtime/engine.js?raw';
import type { Project, SectionType } from '../model/schema';
import { ELEMENT_KEY, SECTION_TYPES } from '../model/schema';
import { SECTION_LABELS } from '../model/defaults';
import { createRandomIds } from '../model/ids';
import { countPlaceholders, renderPage } from '../render/html';
import type { ProjectStore } from '../storage/projectStore';
import { useProject } from './useProject';
import { ContentPanel, StylePanel } from './panels/Inspector';
import { AnimationPanel } from './panels/AnimationPanel';
import { ThemePanel } from './panels/ThemePanel';
import { SitePanel } from './panels/SitePanel';
import { AssistantPanel } from './panels/AssistantPanel';
import { download, exportHtml, slugify } from './exportSite';

const DEVICES = { desktop: 1280, tablet: 820, mobile: 390 } as const;
const DEVICE_HEIGHTS = { desktop: 800, tablet: 1180, mobile: 844 } as const;
type Device = keyof typeof DEVICES;
type Tab = 'content' | 'style' | 'animation' | 'theme' | 'site' | 'ai';

interface Props { initial: Project; store: ProjectStore; onClose: () => void }

export function Editor({ initial, store, onClose }: Props) {
  const { project, dispatch, applyMany, undo, redo, canUndo, canRedo, status, lastError, clearError } = useProject(initial, store);
  const [pageId, setPageId] = useState(project.pages[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(project.pages[0].sections[1]?.id ?? null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [zoomChoice, setZoomChoice] = useState<number | 'fit'>('fit');
  const [canvasWidth, setCanvasWidth] = useState(1280);
  const canvas = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [replayKey, setReplayKey] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);
  const layerIds = useMemo(() => createRandomIds(), []);

  // Track the canvas width so the "Fit" zoom scales the device to the available space.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCanvasWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0];
  const section = page.sections.find((s) => s.id === selectedId) ?? null;

  const html = useMemo(
    () => renderPage(project, { pageId: page.id, mode: preview ? 'export' : 'editor', selectedId, selectedElement, runtimeJs }),
    [project, page.id, selectedId, selectedElement, preview],
  );

  // Canvas -> editor: section selection.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const data = e.data as { source?: string; type?: string; id?: string };
      if (data?.source !== 'dynaweb-canvas') return;
      if (data.type === 'select' && typeof data.id === 'string') {
        setSelectedId(data.id);
        const el = (data as { element?: unknown }).element;
        setSelectedElement(typeof el === 'string' && ELEMENT_KEY.test(el) ? el : null);
      }
      if (data.type === 'scroll' && typeof (data as { y?: unknown }).y === 'number') scrollY.current = (data as { y: number }).y;
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Keyboard shortcuts for undo / redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Keep the canvas scroll position across re-renders (the sandboxed canvas reports it by message).
  const restoreScroll = () => { frame.current?.contentWindow?.postMessage({ source: 'dynaweb-editor', type: 'restore', y: scrollY.current }, '*'); };

  const addSection = (type: SectionType) => {
    const index = section ? page.sections.indexOf(section) + 1 : page.sections.length;
    dispatch({ kind: 'addSection', pageId: page.id, sectionType: type, index });
  };

  const onDrop = (targetIndex: number) => {
    if (dragId) dispatch({ kind: 'moveSection', pageId: page.id, sectionId: dragId, toIndex: targetIndex });
    setDragId(null);
  };

  const placeholders = countPlaceholders(project);
  const exportSite = () => {
    if (placeholders > 0 && !window.confirm(`${placeholders} placeholder texts are still in [brackets]. Export anyway?`)) return;
    download(`${slugify(project.name)}.html`, exportHtml(project), 'text/html');
  };

  const width = DEVICES[device];
  const zoom = zoomChoice === 'fit' ? Math.min(1, Math.max(0.2, canvasWidth / width)) : zoomChoice;
  return (
    <div className="ed-app">
      <header className="ed-toolbar">
        <button type="button" onClick={onClose} aria-label="Back to projects">Projects</button>
        <input className="ed-title" value={project.name} aria-label="Project name"
          onChange={(e) => e.target.value.trim() && dispatch({ kind: 'renameProject', name: e.target.value })} />
        <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
        <span className={`ed-status ed-status-${status}`} role="status">{{ saved: 'Saved', unsaved: 'Unsaved changes', saving: 'Saving', error: 'Save failed' }[status]}</span>
        <div className="ed-spacer" />
        <div className="ed-seg" role="group" aria-label="Device">
          {(Object.keys(DEVICES) as Device[]).map((d) => (
            <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>{d[0].toUpperCase() + d.slice(1)}</button>
          ))}
        </div>
        <select value={String(zoomChoice)} onChange={(e) => setZoomChoice(e.target.value === 'fit' ? 'fit' : Number(e.target.value))} aria-label="Zoom">
          <option value="fit">Fit</option>
          {[0.5, 0.75, 1].map((z) => <option key={z} value={z}>{z * 100}%</option>)}
        </select>
        <button type="button" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</button>
        <button type="button" onClick={() => download(`${slugify(project.name)}.dynaweb.json`, JSON.stringify(project, null, 2), 'application/json')}>Save file</button>
        <button type="button" className="ed-primary" onClick={exportSite}>Export HTML</button>
        <button type="button" disabled title="Publishing arrives in Phase 6">Publish</button>
      </header>
      {lastError && <div className="ed-error" role="alert">{lastError} <button type="button" onClick={clearError}>Dismiss</button></div>}

      <aside className="ed-left" aria-label="Structure">
        <h2 className="ed-h">Pages</h2>
        <ul className="ed-list">
          {project.pages.map((p) => (
            <li key={p.id}><button type="button" aria-current={p.id === page.id} onClick={() => setPageId(p.id)}>{p.title}</button></li>
          ))}
        </ul>
        <h2 className="ed-h">Sections</h2>
        <ol className="ed-list ed-layers">
          {page.sections.map((s, i) => (
            <li key={s.id} draggable onDragStart={() => setDragId(s.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
              className={`${s.id === selectedId ? 'is-on' : ''}${dragId === s.id ? ' is-drag' : ''}`}>
              <button type="button" className="ed-layer-name" onClick={() => { setSelectedId(s.id); setSelectedElement(null); }}>
                <span className="ed-grip" aria-hidden="true">::</span>{s.name}
                {s.animations.filter((a) => a.enabled).map((a) => <span key={a.id} className="ed-badge">{a.type}</span>)}
              </button>
              <span className="ed-layer-tools">
                <button type="button" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => dispatch({ kind: 'moveSection', pageId: page.id, sectionId: s.id, toIndex: i - 1 })}>Up</button>
                <button type="button" aria-label={`Move ${s.name} down`} disabled={i === page.sections.length - 1} onClick={() => dispatch({ kind: 'moveSection', pageId: page.id, sectionId: s.id, toIndex: i + 1 })}>Dn</button>
                <button type="button" aria-label={`Duplicate ${s.name}`} onClick={() => dispatch({ kind: 'duplicateSection', pageId: page.id, sectionId: s.id })}>Dup</button>
                <button type="button" aria-label={`Delete ${s.name}`} className="ed-danger" onClick={() => {
                  dispatch({ kind: 'removeSection', pageId: page.id, sectionId: s.id });
                  if (s.id === selectedId) setSelectedId(null);
                }}>Del</button>
              </span>
            </li>
          ))}
        </ol>
        <h2 className="ed-h">Add section</h2>
        <div className="ed-library">
          {SECTION_TYPES.map((t) => <button key={t} type="button" onClick={() => addSection(t)}>{SECTION_LABELS[t]}</button>)}
        </div>
        <p className="ed-hint">Assets, more section types and multi-page sites arrive in Phase 3.</p>
      </aside>

      <main className="ed-canvas" aria-label="Canvas" ref={canvas}>
        <div className="ed-device" style={{ width: width * zoom, height: DEVICE_HEIGHTS[device] * zoom }}>
          <iframe
            key={replayKey}
            ref={frame}
            title="Website preview"
            srcDoc={html}
            onLoad={restoreScroll}
            style={{ width, height: DEVICE_HEIGHTS[device], transform: zoom === 1 ? undefined : `scale(${zoom})` }}
            sandbox="allow-scripts"
          />
        </div>
      </main>

      <aside className="ed-right" aria-label="Inspector">
        <div className="ed-tabs" role="tablist">
          {(['content', 'style', 'animation', 'theme', 'site', 'ai'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === 'ai' ? 'AI' : t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <div className="ed-panel">
          {tab === 'theme' && <ThemePanel theme={project.theme} dispatch={dispatch} />}
          {tab === 'site' && <SitePanel project={project} dispatch={dispatch} />}
          {tab === 'ai' && <AssistantPanel project={project} applyMany={applyMany} />}
          {tab !== 'theme' && tab !== 'site' && tab !== 'ai' && !section && <p className="ed-empty">Select a section on the canvas or in the list.</p>}
          {tab === 'content' && section && <ContentPanel pageId={page.id} section={section} dispatch={dispatch} />}
          {tab === 'style' && section && <StylePanel pageId={page.id} section={section} dispatch={dispatch} />}
          {tab === 'animation' && section && (
            <AnimationPanel pageId={page.id} section={section} element={selectedElement} onClearElement={() => setSelectedElement(null)} dispatch={dispatch} onReplay={() => setReplayKey((k) => k + 1)} newLayerId={() => layerIds('layer')} />
          )}
        </div>
      </aside>
    </div>
  );
}
