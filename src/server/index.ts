import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadServerEnv } from './env';

loadServerEnv();

const { handleAiRouteApi } = await import('./aiRouteService');
const { handleAiJourneyApi } = await import('./aiJourneyService');
const { handleAiVisionApi } = await import('./aiVisionService');
const { handleSessionApi } = await import('./sessionApi');
const { handleSpaceApi } = await import('./spaceApi');

const root = join(fileURLToPath(new URL('../..', import.meta.url)), 'dist');
const port = Number(process.env.PORT ?? 4173);

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

async function serveStatic(pathname: string, response: ServerResponse) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(root, requestedPath);
  const resolvedPath = existsSync(filePath) ? filePath : join(root, 'index.html');
  const fileStat = await stat(resolvedPath);
  response.statusCode = 200;
  response.setHeader('content-length', fileStat.size);
  response.setHeader('content-type', contentTypes[extname(resolvedPath)] ?? 'application/octet-stream');
  createReadStream(resolvedPath).pipe(response);
}

createServer(async (request, response) => {
  const handled = (await handleAiRouteApi(request, response)) || (await handleAiVisionApi(request, response)) || (await handleAiJourneyApi(request, response)) || (await handleSpaceApi(request, response)) || (await handleSessionApi(request, response));
  if (handled) return;

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    await serveStatic(url.pathname, response);
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
}).listen(port, () => {
  console.log(`Love Atlas server listening on http://localhost:${port}`);
});
