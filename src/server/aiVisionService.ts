import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiBody = Record<string, unknown>;
type MapArea = 'forest' | 'coast' | 'valley' | 'city' | 'garden';

const VALID_AREAS = ['forest', 'coast', 'valley', 'city', 'garden'] as const;
const VALID_TAGS = ['daily', 'memory', 'emotion', 'future', 'conflict', 'moment', 'ocr-text', 'cafe', 'travel', 'home', 'gift', 'meal', 'chat', 'celebration'] as const;

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {} as ApiBody;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as ApiBody;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

function extractJsonObject(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Vision model returned invalid JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeTags(value: unknown) {
  const tags = Array.isArray(value) ? value : [];
  const normalized = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => (VALID_TAGS as readonly string[]).includes(tag));
  return Array.from(new Set(normalized)).slice(0, 6);
}

function normalizeArea(value: unknown): MapArea {
  return typeof value === 'string' && (VALID_AREAS as readonly string[]).includes(value)
    ? value as MapArea
    : 'coast';
}

function isPlaceholder(value: string | undefined) {
  return !value || value.includes('[YOUR_') || value.includes('your-provider.example.com');
}

async function analyzeMomentImage(params: {
  imageDataUrl: string;
  fileName: string;
  momentText: string;
  ocrText: string;
  language: 'cn' | 'en';
}) {
  const endpoint = process.env.MINICPM_V_API_URL ?? process.env.VLM_API_URL;
  const apiKey = process.env.MINICPM_V_API_KEY ?? process.env.VLM_API_KEY;
  const model = process.env.MINICPM_V_MODEL ?? process.env.VLM_MODEL ?? 'openbmb/MiniCPM-V-4_5';
  if (isPlaceholder(endpoint) || isPlaceholder(apiKey)) throw new Error('Vision model API is not configured');
  const configuredEndpoint = endpoint as string;
  const configuredApiKey = apiKey as string;

  const isCn = params.language === 'cn';
  const prompt = isCn
    ? [
        '你是 Love Atlas 的关系场景理解模型。请观察图片，并结合用户补充文字和 OCR 文字，判断它对一次双人关系探索有什么意义。',
        '只返回 JSON，不要 Markdown。格式：',
        '{"tags":["daily"],"area":"valley","caption":"一句话描述图片场景","reason":"一句话说明为什么影响这个关系地图区域"}',
        'area 只能是 forest/coast/valley/city/garden。',
        'tags 只能从 daily/memory/emotion/future/conflict/moment/ocr-text/cafe/travel/home/gift/meal/chat/celebration 里选。',
        `文件名：${params.fileName || '-'}`,
        `用户补充：${params.momentText || '-'}`,
        `OCR文字：${params.ocrText || '-'}`,
      ].join('\n')
    : [
        'You are the relationship scene understanding model for Love Atlas. Observe the image and combine it with user note and OCR text.',
        'Return JSON only, no Markdown. Format:',
        '{"tags":["daily"],"area":"valley","caption":"one sentence image scene","reason":"one sentence explaining why it affects this relationship map area"}',
        'area must be one of forest/coast/valley/city/garden.',
        'tags must be chosen from daily/memory/emotion/future/conflict/moment/ocr-text/cafe/travel/home/gift/meal/chat/celebration.',
        `File name: ${params.fileName || '-'}`,
        `User note: ${params.momentText || '-'}`,
        `OCR text: ${params.ocrText || '-'}`,
      ].join('\n');

  const apiResponse = await fetch(configuredEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${configuredApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: params.imageDataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`Vision model API error: ${apiResponse.status}${errorText ? ` - ${errorText.slice(0, 500)}` : ''}`);
  }
  const data = await apiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty vision model response');

  const parsed = extractJsonObject(content);
  const tags = normalizeTags(parsed.tags);
  return {
    tags: tags.length > 0 ? tags : ['moment'],
    area: normalizeArea(parsed.area),
    caption: typeof parsed.caption === 'string' ? parsed.caption.trim().slice(0, 240) : '',
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim().slice(0, 240) : '',
    source: 'cloud-vlm',
  };
}

export async function handleAiVisionApi(request: IncomingMessage, response: ServerResponse) {
  if (!request.url?.startsWith('/api/ai/moment-image')) return false;

  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return true;
    }
    const body = await readBody(request);
    const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
    if (!imageDataUrl.startsWith('data:image/')) throw new Error('Image data URL is required');
    const result = await analyzeMomentImage({
      imageDataUrl,
      fileName: typeof body.fileName === 'string' ? body.fileName : '',
      momentText: typeof body.momentText === 'string' ? body.momentText : '',
      ocrText: typeof body.ocrText === 'string' ? body.ocrText : '',
      language: body.language === 'en' ? 'en' : 'cn',
    });
    sendJson(response, 200, result);
    return true;
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'Vision image analysis failed' });
    return true;
  }
}
