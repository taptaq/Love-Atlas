import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiBody = Record<string, unknown>;

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

const VALID_AREAS = ['forest', 'coast', 'valley', 'city', 'garden'] as const;
type MapArea = (typeof VALID_AREAS)[number];

const areaDescriptions: Record<MapArea, string> = {
  forest: '情绪森林 - 情绪、感受与真实表达',
  coast: '回忆海岸 - 回忆、共同经历与旧时刻',
  valley: '日常山谷 - 日常生活、陪伴与节奏',
  city: '未来之城 - 未来计划、期待与共同方向',
  garden: '边界花园 - 界限、差异、需要与理解',
};

const stageLabels: Record<string, string> = {
  new: '刚刚开始',
  dating: '稳定交往',
  'long-term': '长期关系',
  'long-distance': '异地关系',
};

const goalLabels: Record<string, string> = {
  know: '更了解彼此',
  icebreak: '轻松破冰',
  common: '寻找共同点',
  connect: '加深连接',
  fresh: '制造新鲜感',
  deep: '聊深一点',
  habit: '看见日常',
  needs: '表达需要',
  review: '回顾关系',
  sync: '同步近况',
  miss: '表达想念',
  future: '聊聊未来',
};

interface AiRouteResult {
  areas: MapArea[];
  reason: string;
}

async function generateRouteWithAI(params: {
  stage: string | null;
  goal: string | null;
  language: 'cn' | 'en';
}): Promise<AiRouteResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured');

  const stageText = params.stage ? stageLabels[params.stage] ?? params.stage : '未指定';
  const goalText = params.goal ? goalLabels[params.goal] ?? params.goal : '未指定';
  const isCn = params.language === 'cn';

  const systemPrompt = isCn
    ? '你是一个关系探索路线设计师。根据关系阶段和探索目标，从以下5个区域中选择2-3个组成探索路线。区域列表：\n' +
      VALID_AREAS.map((a) => `- ${a}: ${areaDescriptions[a]}`).join('\n') +
      '\n\n只返回 JSON，格式：{"areas": ["区域1","区域2"], "reason": "一句话说明为什么选这条路线"}'
    : 'You are a relationship exploration route designer. Based on the relationship stage and goal, select 2-3 areas from the following 5 to form a route. Areas:\n' +
      VALID_AREAS.map((a) => `- ${a}: ${areaDescriptions[a]}`).join('\n') +
      '\n\nReturn only JSON: {"areas": ["area1","area2"], "reason": "one sentence explaining the route"}';

  const userPrompt = isCn
    ? `关系阶段：${stageText}\n探索目标：${goalText}\n请生成探索路线。`
    : `Relationship stage: ${stageText}\nGoal: ${goalText}\nGenerate a route.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');

  const parsed = JSON.parse(content) as { areas?: unknown; reason?: unknown };
  const rawAreas = Array.isArray(parsed.areas) ? parsed.areas : [];
  const areas = rawAreas
    .filter((a): a is MapArea => typeof a === 'string' && (VALID_AREAS as readonly string[]).includes(a))
    .slice(0, 3);

  if (areas.length < 2) throw new Error('AI returned insufficient areas');

  const reason = typeof parsed.reason === 'string' ? parsed.reason : '';
  return { areas, reason };
}

export async function handleAiRouteApi(request: IncomingMessage, response: ServerResponse) {
  if (!request.url?.startsWith('/api/ai/route')) return false;

  try {
    const body = request.method === 'POST' ? await readBody(request) : {};
    const stage = typeof body.stage === 'string' && body.stage ? body.stage : null;
    const goal = typeof body.goal === 'string' && body.goal ? body.goal : null;
    const language = body.language === 'en' ? 'en' : 'cn';

    const result = await generateRouteWithAI({ stage, goal, language });
    sendJson(response, 200, result);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI route generation failed';
    sendJson(response, 500, { error: message });
    return true;
  }
}
