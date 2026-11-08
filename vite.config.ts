import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Serves POST /api/assist from the dev server. The handler (server/assist.ts)
 * reads ANTHROPIC_API_KEY from the server environment; the key is never sent
 * to the browser. Same-origin only, size-limited, one request at a time.
 */
function dynawebAssist(): Plugin {
  let busy = false;
  return {
    name: 'dynaweb-assist',
    configureServer(server) {
      server.middlewares.use('/api/assist', (req, res) => {
        const send = (status: number, json: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(json));
        };
        if (req.method !== 'POST') return send(405, { ok: false, error: 'Use POST.' });
        const origin = req.headers.origin;
        if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) {
          return send(403, { ok: false, error: 'Cross-origin requests are not allowed.' });
        }
        if (busy) return send(429, { ok: false, error: 'The assistant is already working on a request.' });
        let size = 0;
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) req.destroy();
          else chunks.push(chunk);
        });
        req.on('end', async () => {
          busy = true;
          try {
            const mod = await server.ssrLoadModule('/server/assist.ts');
            const result = await mod.handleAssist(Buffer.concat(chunks).toString('utf8'));
            send(result.status, result.json);
          } catch {
            send(500, { ok: false, error: 'Unexpected error in the assistant.' });
          } finally {
            busy = false;
          }
        });
      });
    },
  };
}

/** Server-only settings that may come from .env.local. They go into the server process, never the browser bundle. */
const SERVER_ENV = ['ANTHROPIC_API_KEY', 'DYNAWEB_AI_MODEL', 'DYNAWEB_AI_EFFORT'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of SERVER_ENV) if (env[key] && !process.env[key]) process.env[key] = env[key];
  return {
    plugins: [react(), dynawebAssist()],
    server: { port: 5173, strictPort: true },
    test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
  };
});
