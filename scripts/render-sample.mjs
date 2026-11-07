// Renders the sample project (tests/helpers.ts) to a standalone HTML file.
// Usage: npm run sample -- [output.html]   (default: dist/sample.html)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const out = resolve(process.argv[2] ?? 'dist/sample.html');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { sampleProject } = await server.ssrLoadModule('/tests/helpers.ts');
  const { renderPage } = await server.ssrLoadModule('/src/render/html.ts');
  const runtime = (await server.ssrLoadModule('/src/runtime/engine.js?raw')).default;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderPage(sampleProject(), { mode: 'export', runtimeJs: runtime }));
  console.warn(`Sample written to ${out}`);
} finally {
  await server.close();
}
