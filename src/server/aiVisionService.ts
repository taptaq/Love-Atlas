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

function normalizeCaption(value: unknown) {
  if (typeof value !== 'string') return '';
  const caption = value.trim();
  if (!caption) return '';
  const compactCaption = caption.toLowerCase().replace(/[\s._-]+/g, '');
  const emptyCaptions = new Set(['empty', 'none', 'null', 'na', 'n/a', 'unknown', 'blank']);
  if (emptyCaptions.has(compactCaption)) return '';
  if (/^(no|not)(clear|visible|recognizable|enough)?(image|content|scene|object)?$/i.test(caption.replace(/\s+/g, ''))) return '';
  if (/^(无法|未能|没有|看不出|识别不出).{0,16}(识别|看清|内容|场景|图片)/.test(caption)) return '';
  return caption.slice(0, 240);
}

function inferFallbackTags(fileName: string, text: string, ocrText = '') {
  const source = `${fileName} ${text} ${ocrText}`.toLowerCase();
  const tags = new Set<string>();
  if (/home|room|daily|家|房间|日常/.test(source)) tags.add('daily');
  if (/travel|trip|road|旅|路上|车|回忆|想念|纪念|miss|memory/.test(source)) tags.add('memory');
  if (/night|moon|晚|夜|感受|喜欢|爱|开心|难过|feel|love/.test(source)) tags.add('emotion');
  if (/future|plan|未来|计划|以后|约定|期待|promise/.test(source)) tags.add('future');
  if (/fight|conflict|argue|吵|争|冷战|生气|抱歉|道歉|sorry/.test(source)) tags.add('conflict');
  if (/cafe|coffee|咖啡/.test(source)) tags.add('cafe');
  if (/meal|food|饭|餐|吃/.test(source)) tags.add('meal');
  if (/photo|image|moment|照片|此刻/.test(source)) tags.add('moment');
  if (ocrText.trim()) tags.add('ocr-text');
  if (tags.size === 0) tags.add('moment');
  return Array.from(tags).filter((tag) => (VALID_TAGS as readonly string[]).includes(tag)).slice(0, 6);
}

function inferFallbackArea(tags: string[]): MapArea {
  if (tags.includes('conflict')) return 'garden';
  if (tags.includes('future')) return 'city';
  if (tags.includes('memory')) return 'coast';
  if (tags.includes('emotion')) return 'forest';
  if (tags.includes('daily') || tags.includes('home') || tags.includes('cafe') || tags.includes('meal')) return 'valley';
  return 'coast';
}

function isPlaceholder(value: string | undefined) {
  return !value || value.includes('[YOUR_') || value.includes('your-provider.example.com');
}

/**
 * 调用视觉模型（OpenAI 兼容格式），返回原始 JSON 解析结果。
 * 抽象出共用逻辑，供 Qwen / MiniCPM-V 等不同 provider 复用。
 */
async function callVisionModel(params: {
  endpoint: string;
  apiKey: string;
  model: string;
  imageDataUrl: string;
  prompt: string;
}) {
  const apiResponse = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: params.prompt },
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
  return extractJsonObject(content);
}

/**
 * 解析视觉模型返回的 JSON，归一化为统一的 CloudMomentImageResult。
 */
function buildVisionResult(parsed: Record<string, unknown>, params: {
  fileName: string;
  momentText: string;
  ocrText: string;
  language: 'cn' | 'en';
}): { tags: string[]; area: MapArea; caption: string; reason: string; source: 'cloud-vlm' | 'fallback' } {
  const tags = normalizeTags(parsed.tags);
  const caption = normalizeCaption(parsed.caption);
  const reason = typeof parsed.reason === 'string' ? parsed.reason.trim().slice(0, 240) : '';
  if (!caption && !reason) {
    const fallbackTags = tags.length > 0 ? tags : inferFallbackTags(params.fileName, params.momentText, params.ocrText);
    return {
      tags: fallbackTags,
      area: inferFallbackArea(fallbackTags),
      caption: '',
      reason: params.language === 'cn'
        ? '图片里没有识别出足够清晰的场景信息，已保留基础图片线索。'
        : 'No clear scene information was recognized in this image, so basic image cues were kept.',
      source: 'fallback',
    };
  }
  return {
    tags: tags.length > 0 ? tags : ['moment'],
    area: normalizeArea(parsed.area),
    caption,
    reason,
    source: 'cloud-vlm',
  };
}

function buildVisionPrompt(params: {
  fileName: string;
  momentText: string;
  ocrText: string;
  language: 'cn' | 'en';
}) {
  const isCn = params.language === 'cn';
  return isCn
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
}

/**
 * 视觉识别链路：Qwen 首选 → MiniCPM-V 回退 → 启发式兜底。
 * Qwen (qwen3.5-omni-plus-2026-03-15) 放在首个调用，失败时自动降级到 MiniCPM-V。
 */
async function analyzeMomentImage(params: {
  imageDataUrl: string;
  fileName: string;
  momentText: string;
  ocrText: string;
  language: 'cn' | 'en';
}) {
  const prompt = buildVisionPrompt(params);
  const buildParams = { fileName: params.fileName, momentText: params.momentText, ocrText: params.ocrText, language: params.language };

  // 1. 首选：Qwen 视觉模型
  const qwenEndpoint = process.env.QWEN_VISION_API_URL;
  const qwenApiKey = process.env.QWEN_VISION_API_KEY;
  const qwenModel = process.env.QWEN_VISION_MODEL ?? 'qwen3.5-omni-plus-2026-03-15';
  if (!isPlaceholder(qwenEndpoint) && !isPlaceholder(qwenApiKey)) {
    try {
      // Qwen 兼容 OpenAI 格式，endpoint 通常是 base URL，需补 /chat/completions
      const fullEndpoint = qwenEndpoint!.endsWith('/chat/completions')
        ? qwenEndpoint!
        : `${qwenEndpoint!.replace(/\/$/, '')}/chat/completions`;
      const parsed = await callVisionModel({
        endpoint: fullEndpoint,
        apiKey: qwenApiKey as string,
        model: qwenModel,
        imageDataUrl: params.imageDataUrl,
        prompt,
      });
      const result = buildVisionResult(parsed, buildParams);
      if (result.source === 'cloud-vlm') {
        console.log('[aiVision] qwen3.5-omni-plus-2026-03-15 succeeded');
        return result;
      }
      // Qwen 返回了 fallback（caption/reason 为空），继续尝试 MiniCPM-V
      console.warn('[aiVision] qwen returned fallback result, trying MiniCPM-V');
    } catch (error) {
      console.warn('[aiVision] qwen3.5-omni-plus-2026-03-15 failed, falling back to MiniCPM-V:', error instanceof Error ? error.message : error);
    }
  }

  // 2. 回退：MiniCPM-V
  const minicpmEndpoint = process.env.MINICPM_V_API_URL ?? process.env.VLM_API_URL;
  const minicpmApiKey = process.env.MINICPM_V_API_KEY ?? process.env.VLM_API_KEY;
  const minicpmModel = process.env.MINICPM_V_MODEL ?? process.env.VLM_MODEL ?? 'openbmb/MiniCPM-V-4_5';
  if (!isPlaceholder(minicpmEndpoint) && !isPlaceholder(minicpmApiKey)) {
    try {
      const parsed = await callVisionModel({
        endpoint: minicpmEndpoint as string,
        apiKey: minicpmApiKey as string,
        model: minicpmModel,
        imageDataUrl: params.imageDataUrl,
        prompt,
      });
      const result = buildVisionResult(parsed, buildParams);
      if (result.source === 'cloud-vlm') {
        console.log('[aiVision] MiniCPM-V succeeded');
        return result;
      }
      console.warn('[aiVision] MiniCPM-V returned fallback result');
      return result;
    } catch (error) {
      console.warn('[aiVision] MiniCPM-V failed:', error instanceof Error ? error.message : error);
    }
  }

  // 3. 最终兜底：启发式推断
  throw new Error('All vision models unavailable');
}

export async function handleAiVisionApi(request: IncomingMessage, response: ServerResponse) {
  if (!request.url?.startsWith('/api/ai/moment-image')) return false;

  let body: ApiBody = {};
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return true;
    }
    body = await readBody(request);
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
    const message = error instanceof Error ? error.message : 'Vision image analysis failed';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[aiVision] cloud analysis failed:', message, stack);
    const fileName = typeof body.fileName === 'string' ? body.fileName : '';
    const momentText = typeof body.momentText === 'string' ? body.momentText : '';
    const ocrText = typeof body.ocrText === 'string' ? body.ocrText : '';
    const tags = inferFallbackTags(fileName, momentText, ocrText);
    sendJson(response, 200, {
      tags,
      area: inferFallbackArea(tags),
      caption: '',
      reason: momentText ? '云端视觉暂不可用，已先根据文字和文件线索调整路线。' : '云端视觉暂不可用，已保留基础图片线索。',
      source: 'fallback',
      // 暴露具体错误原因给前端，方便排查模型链路问题
      error: message,
      model: 'qwen3.5-omni-plus-2026-03-15',
    });
    return true;
  }
}
