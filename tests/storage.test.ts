import { describe, expect, it } from 'vitest';
import { ProjectStore, memoryStore, migrate } from '../src/storage/projectStore';
import { sampleProject } from './helpers';

describe('project store', () => {
  it('saves and reloads a project unchanged', () => {
    const store = new ProjectStore(memoryStore());
    const p = sampleProject();
    store.save(p);
    expect(store.load(p.id)).toEqual(p);
    expect(store.list()).toEqual([{ id: p.id, name: p.name, updatedAt: p.updatedAt }]);
  });

  it('keeps the index ordered by most recent save and removes projects', () => {
    const store = new ProjectStore(memoryStore());
    const a = sampleProject();
    const b = { ...sampleProject(), id: 'proj_other', name: 'Other' };
    store.save(a);
    store.save(b);
    expect(store.list().map((x) => x.id)).toEqual(['proj_other', a.id]);
    store.remove('proj_other');
    expect(store.list().map((x) => x.id)).toEqual([a.id]);
    expect(() => store.load('proj_other')).toThrow('project not found');
  });

  it('refuses to save an invalid project', () => {
    const store = new ProjectStore(memoryStore());
    const bad = { ...sampleProject(), name: '' };
    expect(() => store.save(bad)).toThrow('refusing to save invalid project');
  });

  it('rejects corrupt or foreign files with a clear message', () => {
    const store = new ProjectStore(memoryStore());
    expect(() => store.parse('{not json')).toThrow('not valid JSON');
    expect(() => store.parse('{"schemaVersion":1,"id":"proj_x"}')).toThrow('invalid project');
    expect(() => store.parse(JSON.stringify({ ...sampleProject(), schemaVersion: 99 }))).toThrow('newer Dynaweb');
  });

  it('survives a corrupt index', () => {
    const kv = memoryStore();
    kv.setItem('dynaweb:index', 'garbage');
    expect(new ProjectStore(kv).list()).toEqual([]);
  });

  it('has no migration path for unknown old versions', () => {
    expect(() => migrate({ schemaVersion: 0 })).toThrow('no migration from schema 0');
  });
});
