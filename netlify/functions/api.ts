import { Readable } from 'node:stream';
import type { Handler } from '@netlify/functions';
import type { IncomingMessage, ServerResponse } from 'node:http';

// 加载 .env（本地开发用；Netlify 生产环境变量已注入，无 .env 时自动跳过）
const { loadServerEnv } = await import('../../src/server/env');
loadServerEnv();

const { handleAiRouteApi } = await import('../../src/server/aiRouteService');
const { handleAiVisionApi } = await import('../../src/server/aiVisionService');
const { handleAiJourneyApi } = await import('../../src/server/aiJourneyService');
const { handleSpaceApi } = await import('../../src/server/spaceApi');
const { handleSessionApi } = await import('../../src/server/sessionApi');

interface FakeResponseState {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
}

function createFakeRequest(event: Parameters<Handler>[0]): IncomingMessage {
  const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64') : Buffer.from(event.body ?? '', 'utf8');
  const stream = Readable.from([raw]);
  const req = Object.create(stream) as IncomingMessage;

  req.method = event.httpMethod;
  req.url = event.rawUrl ? new URL(event.rawUrl).pathname + (event.rawUrl.split('?')[1] ? `?${event.rawUrl.split('?')[1]}` : '') : event.path;
  req.headers = {
    host: event.headers.host ?? 'localhost',
    'content-type': event.headers['content-type'] ?? 'application/json',
    'content-length': String(raw.length),
    ...event.headers,
  };

  return req;
}

function createFakeResponse(): { response: ServerResponse; state: FakeResponseState; promise: Promise<void> } {
  const state: FakeResponseState = { statusCode: 200, headers: {}, body: '' };
  const res = Object.create({}) as ServerResponse;

  res.statusCode = 200;
  res.setHeader = (name: string, value: string | string[]) => {
    state.headers[name.toLowerCase()] = value;
    return res;
  };
  res.getHeader = (name: string) => state.headers[name.toLowerCase()];
  res.removeHeader = (name: string) => {
    delete state.headers[name.toLowerCase()];
  };
  res.writeHead = (code: number) => {
    state.statusCode = code;
    return res;
  };

  let ended = false;
  let resolveEnd: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolveEnd = resolve;
  });

  res.write = (chunk: unknown) => {
    if (ended) return false;
    state.body += typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf8');
    return true;
  };
  res.end = (chunk?: unknown) => {
    if (!ended) {
      ended = true;
      if (chunk !== undefined && chunk !== null) {
        state.body += typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf8');
      }
      state.statusCode = res.statusCode ?? state.statusCode;
      resolveEnd?.();
    }
    return res;
  };

  return { response: res, state, promise };
}

export const handler: Handler = async (event) => {
  // 只处理 API 请求
  if (!event.path?.startsWith('/api/')) {
    return { statusCode: 404, body: 'Not found' };
  }

  const req = createFakeRequest(event);
  const { response: res, state, promise } = createFakeResponse();

  const handled =
    (await handleAiRouteApi(req, res)) ||
    (await handleAiVisionApi(req, res)) ||
    (await handleAiJourneyApi(req, res)) ||
    (await handleSpaceApi(req, res)) ||
    (await handleSessionApi(req, res));

  if (!handled) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }), headers: { 'content-type': 'application/json' } };
  }

  await promise;

  const singleHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(state.headers)) {
    singleHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  return {
    statusCode: state.statusCode,
    headers: singleHeaders,
    body: state.body,
  };
};
