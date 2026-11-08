// Renders a neutral sample project ("Your Company", service-company starting point) to a standalone HTML file.
// Usage: npm run sample -- [output.html]   (default: dist/sample.html)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const out = resolve(process.argv[2] ?? 'dist/sample.html');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { generateProject } = await server.ssrLoadModule('/src/generator/generate.ts');
  const { getArea } = await server.ssrLoadModule('/src/generator/areas.ts');
  const { createSequentialIds } = await server.ssrLoadModule('/src/model/ids.ts');
  const { renderPage } = await server.ssrLoadModule('/src/render/html.ts');
  const runtime = (await server.ssrLoadModule('/src/runtime/engine.js?raw')).default;
  mkdirSync(dirname(out), { recursive: true });
  const area = getArea('services');
  const meta = {
    purpose: '', description: '', activity: area.activity, location: '', atmosphere: area.atmosphere, audience: '',
    goal: area.goal, objective: '', language: 'en', languages: ['en'], references: '', colors: '', typography: '',
    imagery: '', layout: '', motion: '', features: '', technical: '', brief: '', siteUrl: '', schemaType: area.schemaType,
  };
  const project = generateProject({ name: 'Your Company', owner: 'sample', meta, presetId: 'quarry', motionIntensity: 1, sections: area.sections, headings: area.headings }, createSequentialIds(), new Date().toISOString());
  writeFileSync(out, renderPage(project, { mode: 'export', runtimeJs: runtime }));
  console.warn(`Sample written to ${out}`);
} finally {
  await server.close();
}
