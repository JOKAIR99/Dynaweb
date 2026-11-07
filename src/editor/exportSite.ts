import runtimeJs from '../runtime/engine.js?raw';
import type { Project } from '../model/schema';
import { renderPage } from '../render/html';

export function exportHtml(project: Project): string {
  return renderPage(project, { mode: 'export', runtimeJs });
}

export function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
