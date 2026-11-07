import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Project } from './model/schema';
import { ProjectStore } from './storage/projectStore';
import { Editor } from './editor/Editor';
import { CreateWizard } from './editor/CreateWizard';
import './styles.css';

type Screen = { kind: 'home' } | { kind: 'create' } | { kind: 'edit'; project: Project };

function App() {
  const store = useMemo(() => new ProjectStore(window.localStorage), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [error, setError] = useState<string | null>(null);
  const [, refresh] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const open = (id: string) => {
    try { setScreen({ kind: 'edit', project: store.load(id) }); } catch (e) { setError(e instanceof Error ? e.message : 'could not open project'); }
  };
  const create = (project: Project) => { store.save(project); setScreen({ kind: 'edit', project }); };
  const importFile = async (file: File) => {
    try {
      const project = store.parse(await file.text());
      store.save(project);
      setScreen({ kind: 'edit', project });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'import failed');
    }
  };

  if (screen.kind === 'edit') return <Editor initial={screen.project} store={store} onClose={() => setScreen({ kind: 'home' })} />;
  if (screen.kind === 'create') return <CreateWizard onCreate={create} onCancel={() => setScreen({ kind: 'home' })} />;

  const projects = store.list();
  return (
    <main className="home">
      <h1>Dynaweb Studio</h1>
      <p className="ed-hint">Projects are stored in this browser. Use "Save file" in the editor to keep a copy.</p>
      <div className="ed-row">
        <button type="button" className="ed-primary" onClick={() => setScreen({ kind: 'create' })}>New website</button>
        <button type="button" onClick={() => fileInput.current?.click()}>Open project file</button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
      </div>
      {error && <p className="ed-error" role="alert">{error}</p>}
      <ul className="home-list">
        {projects.length === 0 && <li className="ed-empty">No projects yet.</li>}
        {projects.map((p) => (
          <li key={p.id}>
            <button type="button" className="home-open" onClick={() => open(p.id)}>{p.name}<small>Edited {new Date(p.updatedAt).toLocaleString()}</small></button>
            <button type="button" className="ed-danger" onClick={() => { if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) { store.remove(p.id); refresh((n) => n + 1); } }}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<StrictMode><App /></StrictMode>);
