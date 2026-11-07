import { SCHEMA_VERSION, validateProject } from '../model/schema';
import type { Project } from '../model/schema';

/**
 * Versioned project persistence. The storage backend is injectable
 * (localStorage in the browser, an in-memory map in tests, a server later).
 * Every load goes through migration and schema validation.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProjectSummary { id: string; name: string; updatedAt: string }

const INDEX_KEY = 'dynaweb:index';
const projectKey = (id: string) => `dynaweb:project:${id}`;

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
/** migrations[n] upgrades a project from schemaVersion n to n + 1. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 -> v2: structured brief fields, form settings on sections, micro-interaction settings.
  1: (raw) => {
    const meta = (raw.meta ?? {}) as Record<string, unknown>;
    const theme = (raw.theme ?? {}) as Record<string, unknown>;
    const language = typeof meta.language === 'string' ? meta.language : 'en';
    const pages = Array.isArray(raw.pages) ? raw.pages : [];
    return {
      ...raw,
      schemaVersion: 2,
      meta: {
        sector: 'other', location: '', atmosphere: 'other', goal: 'information',
        languages: [language], references: '', siteUrl: '',
        ...meta,
      },
      theme: { interactions: { magneticButtons: false, cardHover: true }, ...theme },
      pages: pages.map((page: Record<string, unknown>) => ({
        ...page,
        sections: (Array.isArray(page.sections) ? page.sections : []).map((sec: Record<string, unknown>) => ({
          ...sec,
          content: { formKind: 'inquiry', formEndpoint: '', ...(sec.content as Record<string, unknown>) },
        })),
      })),
    };
  },
};

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new Error(`project was saved by a newer Dynaweb (schema ${version})`);
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`no migration from schema ${version}`);
    current = step(current);
    version += 1;
  }
  return current;
}

export class ProjectStore {
  constructor(private readonly kv: KeyValueStore) {}

  list(): ProjectSummary[] {
    try {
      const parsed = JSON.parse(this.kv.getItem(INDEX_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(project: Project): void {
    const checked = validateProject(project);
    if (!checked.ok) throw new Error(`refusing to save invalid project: ${checked.errors[0]}`);
    this.kv.setItem(projectKey(project.id), JSON.stringify(project));
    const summary = { id: project.id, name: project.name, updatedAt: project.updatedAt };
    const index = [summary, ...this.list().filter((p) => p.id !== project.id)];
    this.kv.setItem(INDEX_KEY, JSON.stringify(index));
  }

  load(id: string): Project {
    const text = this.kv.getItem(projectKey(id));
    if (text === null) throw new Error(`project not found: ${id}`);
    return this.parse(text);
  }

  /** Parses an exported/imported project JSON file. */
  parse(text: string): Project {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('file is not valid JSON');
    }
    if (typeof raw !== 'object' || raw === null) throw new Error('file is not a Dynaweb project');
    const checked = validateProject(migrate(raw as Record<string, unknown>));
    if (!checked.ok) throw new Error(`invalid project: ${checked.errors.slice(0, 3).join('; ')}`);
    return checked.project;
  }

  remove(id: string): void {
    this.kv.removeItem(projectKey(id));
    this.kv.setItem(INDEX_KEY, JSON.stringify(this.list().filter((p) => p.id !== id)));
  }
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
