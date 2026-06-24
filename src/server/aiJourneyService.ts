import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiBody = Record<string, unknown>;
type MapArea = 'forest' | 'coast' | 'valley' | 'city' | 'garden';
type QuestionType = 'guess' | 'mirror' | 'choice' | 'sync';

const VALID_AREAS = ['forest', 'coast', 'valley', 'city', 'garden'] as const;
const VALID_TYPES = ['guess', 'mirror', 'choice', 'sync'] as const;

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
    if (!match) throw new Error('AI returned invalid JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asArea(value: unknown, fallback: MapArea): MapArea {
  return typeof value === 'string' && (VALID_AREAS as readonly string[]).includes(value) ? value as MapArea : fallback;
}

function asQuestionType(value: unknown): QuestionType {
  return typeof value === 'string' && (VALID_TYPES as readonly string[]).includes(value) ? value as QuestionType : 'guess';
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
}

function buildMomentQuestionContext(moment: Record<string, unknown>, questionIndex: number) {
  const scene = asString(moment.scene);
  const text = asString(moment.text);
  const imageCaption = asString(moment.imageCaption);
  const imageTags = asStringArray(moment.imageTags).filter((tag) => tag !== 'ocr-text');
  const imageOcrText = asString(moment.imageOcrText);
  const routeInfluence = moment.routeInfluence && typeof moment.routeInfluence === 'object'
    ? moment.routeInfluence as Record<string, unknown>
    : {};
  const routeArea = asString(routeInfluence.primaryArea);
  const routeReason = asString(routeInfluence.reason);
  const hasMoment = Boolean(scene || text || imageCaption || imageTags.length || imageOcrText || routeReason);

  if (!hasMoment) {
    return [
      'Present moment status: none.',
      'Do not invent visual or situational details.',
    ].join('\n');
  }

  const emphasis = questionIndex <= 2
    ? 'For this early question, actively weave ONE concrete present-moment element into the question or hint.'
    : 'For later questions, use the present-moment elements only when they naturally deepen the question.';

  return [
    'Present moment status: applied.',
    emphasis,
    'Use these as interpretation signals, not as a transcript. Do not mention OCR or internal tags to users.',
    scene ? `Scene signal: ${scene}` : '',
    text ? `User note signal: ${text.slice(0, 300)}` : '',
    imageCaption ? `Visual understanding signal: ${imageCaption.slice(0, 300)}` : '',
    imageTags.length ? `Visual tags: ${imageTags.join(', ')}` : '',
    imageOcrText ? `Hidden image text signal: ${imageOcrText.slice(0, 240)}` : '',
    routeArea || routeReason ? `Route influence from moment: ${routeArea || 'unknown'}${routeReason ? ` - ${routeReason.slice(0, 240)}` : ''}` : '',
    'Good outputs should connect the relationship question to the concrete scene, object, daily mood, memory, future clue, conflict clue, or emotional atmosphere found above.',
    'Avoid generic questions if a concrete present-moment signal exists.',
  ].filter(Boolean).join('\n');
}

async function callDeepSeekJson(prompt: string, maxTokens: number) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes('[YOUR_')) throw new Error('DEEPSEEK_API_KEY is not configured');

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are Love Atlas, a careful relationship exploration assistant. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.72,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');
  return extractJsonObject(content);
}

async function generateQuestion(body: ApiBody) {
  const areas = Array.isArray(body.areas)
    ? body.areas.filter((area): area is MapArea => typeof area === 'string' && (VALID_AREAS as readonly string[]).includes(area))
    : [];
  const fallbackArea = areas[0] ?? 'forest';
  const history = Array.isArray(body.history) ? body.history.filter((item): item is string => typeof item === 'string').slice(-6) : [];
  const moment = body.moment && typeof body.moment === 'object' ? body.moment : {};
  const questionIndex = Number(body.currentQuestionIndex ?? 0);
  const momentContext = buildMomentQuestionContext(moment as Record<string, unknown>, questionIndex);
  const prompt = [
    'Generate one fresh relationship exploration question for two people.',
    'The question should feel specific, warm, and useful for a real conversation.',
    'If present-moment context is applied, let it shape the question, hint, reason, region, and emotion.',
    'Avoid repeating history questions.',
    'Return JSON only with this format:',
    '{"question":{"cn":"中文问题","en":"English question"},"hint":{"cn":"中文提示","en":"English hint"},"reason":{"cn":"中文生成理由","en":"English reason"},"emotion":"curious","region":"forest","type":"guess"}',
    'region must be one of forest/coast/valley/city/garden.',
    'type must be one of guess/mirror/choice/sync.',
    `Relationship stage: ${asString(body.stage, 'unknown')}`,
    `Goal: ${asString(body.goal, 'unknown')}`,
    `Route areas: ${areas.join(', ') || fallbackArea}`,
    `Question index: ${questionIndex}`,
    momentContext,
    `History: ${history.join(' | ') || 'none'}`,
    `World region progress: ${JSON.stringify(body.worldProgress ?? {})}`,
  ].join('\n');
  const parsed = await callDeepSeekJson(prompt, 500);
  const question = parsed.question && typeof parsed.question === 'object' ? parsed.question as Record<string, unknown> : {};
  const hint = parsed.hint && typeof parsed.hint === 'object' ? parsed.hint as Record<string, unknown> : {};
  const reason = parsed.reason && typeof parsed.reason === 'object' ? parsed.reason as Record<string, unknown> : {};
  return {
    question: asString(question.cn, '今天你最希望对方理解你的哪一部分？'),
    hint: asString(hint.cn, '从一个具体瞬间说起，会更容易靠近。'),
    emotion: asString(parsed.emotion, 'curious'),
    region: asArea(parsed.region, fallbackArea),
    type: asQuestionType(parsed.type),
    localized: {
      cn: asString(question.cn, '今天你最希望对方理解你的哪一部分？'),
      en: asString(question.en, 'What part of you do you most hope the other person understands today?'),
    },
    localizedHint: {
      cn: asString(hint.cn, '从一个具体瞬间说起，会更容易靠近。'),
      en: asString(hint.en, 'Start from a specific moment; it makes closeness easier.'),
    },
    localizedReason: {
      cn: asString(reason.cn, 'AI 根据你们的阶段、目标和此刻信息生成了这个问题。'),
      en: asString(reason.en, 'AI generated this from your stage, goal, and present moment.'),
    },
    reason: asString(reason.cn, 'AI 根据你们的阶段、目标和此刻信息生成了这个问题。'),
  };
}

async function generateSummary(body: ApiBody) {
  const prompt = [
    'Create a concise relationship exploration summary for two people.',
    'Return JSON only with this format:',
    '{"resonance":"共鸣总结","differences":"差异总结","nextTopic":"下次适合聊的问题","actionSuggestion":"一个具体微行动"}',
    'Keep every field under 80 Chinese characters. Be warm, concrete, and not therapeutic/medical.',
    `Relationship stage: ${asString(body.stage, 'unknown')}`,
    `Goal: ${asString(body.goal, 'unknown')}`,
    `Route: ${JSON.stringify(body.route ?? {})}`,
    `Present moment: ${JSON.stringify(body.moment ?? {}).slice(0, 1000)}`,
    `Events: ${JSON.stringify(body.events ?? []).slice(0, 1000)}`,
    `History: ${JSON.stringify(body.history ?? []).slice(0, 5000)}`,
  ].join('\n');
  const parsed = await callDeepSeekJson(prompt, 700);
  return {
    resonance: asString(parsed.resonance, '这次探索让你们看见了彼此当下更真实的状态。'),
    differences: asString(parsed.differences, '你们的差异不是阻碍，而是下一次继续理解的入口。'),
    nextTopic: asString(parsed.nextTopic, '下次可以从一个更具体的生活片段继续聊。'),
    actionSuggestion: asString(parsed.actionSuggestion, '今天找一个轻松时刻，把对方答案里打动你的部分复述给对方听。'),
    generatedBy: 'ai',
  };
}

async function generateCoach(body: ApiBody) {
  const answerA = asString(body.answerA);
  const answerB = asString(body.answerB);
  const similarity = Number(body.similarity ?? 0);
  const question = asString(body.question);
  const prompt = [
    'You are a gentle relationship communication coach.',
    'Two people answered the same question but their answers show significant difference.',
    'Provide a short, warm, non-judgmental communication suggestion to help them bridge the gap.',
    'Do NOT diagnose or give medical/therapeutic advice. Just suggest one concrete way to talk about the difference.',
    'Return JSON only with this format:',
    '{"coach":{"cn":"中文建议（30-60字）","en":"English suggestion (30-60 words)"},"buffer":{"cn":"揭晓前的温和提示（20-40字）","en":"Gentle pre-reveal hint (20-40 words)"}}',
    `Question: ${question}`,
    `Answer A: ${answerA.slice(0, 500)}`,
    `Answer B: ${answerB.slice(0, 500)}`,
    `Similarity: ${similarity}%`,
  ].join('\n');
  const parsed = await callDeepSeekJson(prompt, 400);
  const coach = parsed.coach && typeof parsed.coach === 'object' ? parsed.coach as Record<string, unknown> : {};
  const buffer = parsed.buffer && typeof parsed.buffer === 'object' ? parsed.buffer as Record<string, unknown> : {};
  return {
    coach: {
      cn: asString(coach.cn, '差异不是问题，而是理解的入口。试着问对方：「你这样想是因为什么经历吗？」'),
      en: asString(coach.en, 'Difference is not a problem but a doorway. Try asking: "What experience shaped this view for you?"'),
    },
    buffer: {
      cn: asString(buffer.cn, '你们的答案不太一样，这很正常。揭晓时先深呼吸，带着好奇而不是评判去看。'),
      en: asString(buffer.en, 'Your answers may differ, and that is okay. Take a breath before revealing — approach with curiosity, not judgment.'),
    },
  };
}

async function generateInsights(body: ApiBody) {
  const answerA = asString(body.answerA);
  const answerB = asString(body.answerB);
  const similarity = Number(body.similarity ?? 0);
  const question = asString(body.question);
  const stage = asString(body.stage, 'unknown');
  const goal = asString(body.goal, 'unknown');
  const region = asString(body.region, 'forest');
  const hasMoment = Boolean(body.hasMoment);

  const prompt = [
    'You are Love Atlas, a gentle relationship exploration assistant.',
    'Two people just answered the same question and revealed their answers.',
    'Generate personalized insights based on their actual answers — NOT generic templates.',
    'Look at what each person actually wrote and find the specific emotional nuance.',
    'Return JSON only with this format:',
    '{"insights":{"resonance":"共鸣（中文，20-40字，基于答案实际内容）","difference":"差异（中文，20-40字，基于答案实际内容）","emotion":"情绪信号（中文，15-30字）","suggestion":"建议（中文，20-40字，一个具体可行动的小建议）"},"mirrorSignal":{"trigger":true或false,"nextMemorySeed":"中文，15-30字，若触发镜像事件则给出种子记忆"}}',
    'mirrorSignal.trigger should be true when: long-term/long-distance stage + significant difference (similarity < 40) + answers show genuine misunderstanding (not just different wording).',
    'mirrorSignal.trigger should be false when: answers are similar, or differences are just expression style, or stage is new/dating.',
    'Be warm, specific, non-judgmental. Never diagnose or give medical/therapeutic advice.',
    `Question: ${question}`,
    `Answer A: ${answerA.slice(0, 600)}`,
    `Answer B: ${answerB.slice(0, 600)}`,
    `Similarity: ${similarity}%`,
    `Relationship stage: ${stage}`,
    `Goal: ${goal}`,
    `Region: ${region}`,
    `Has present moment: ${hasMoment}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 500);
  const insights = parsed.insights && typeof parsed.insights === 'object' ? parsed.insights as Record<string, unknown> : {};
  const mirrorSignal = parsed.mirrorSignal && typeof parsed.mirrorSignal === 'object' ? parsed.mirrorSignal as Record<string, unknown> : {};

  return {
    insights: {
      resonance: asString(insights.resonance, similarity >= 45 ? '你们对这个问题有明显重叠的理解。' : '你们的答案之间出现了值得继续看的差异。'),
      difference: asString(insights.difference, similarity >= 45 ? '差异不大，更多是表达方式不同。' : '对方真实表达和你的猜测之间存在距离。'),
      emotion: asString(insights.emotion, '关系地图出现了新的信号。'),
      suggestion: asString(insights.suggestion, similarity >= 45 ? '可以继续追问一个更具体的细节。' : '不要急着解释，先问问对方为什么这样想。'),
    },
    mirrorSignal: {
      trigger: typeof mirrorSignal.trigger === 'boolean' ? mirrorSignal.trigger : false,
      nextMemorySeed: asString(mirrorSignal.nextMemorySeed, similarity < 35 ? '你以为的，和对方真实表达之间出现了差异。' : '你们的理解正在接近。'),
    },
  };
}

async function generateTheme(body: ApiBody) {
  const stage = asString(body.stage, 'unknown');
  const history = Array.isArray(body.history) ? body.history.filter((item): item is string => typeof item === 'string').slice(-6) : [];
  const worldProgress = body.worldProgress && typeof body.worldProgress === 'object' ? body.worldProgress : {};
  const lastExploreDays = Number(body.lastExploreDays ?? -1);
  const weekKey = asString(body.weekKey, 'W01');

  const prompt = [
    'You are Love Atlas, a gentle relationship exploration assistant.',
    'Generate ONE weekly theme blind box for a couple to explore together this week.',
    'The theme should feel warm, specific, and inviting — like a small gift waiting to be opened.',
    'Return JSON only with this format:',
    '{"icon":"🌙","title":{"cn":"中文标题（4-8字）","en":"English title (2-5 words)"},"description":{"cn":"中文描述（20-40字，温暖具体）","en":"English description (15-30 words)"},"goal":"deep","stage":"long-term","momentText":{"cn":"中文此刻场景（15-30字）","en":"English moment scene (10-20 words)"},"accent":"mist"}',
    'goal must be one of: know, icebreak, common, connect, fresh, deep, habit, needs, review, sync, miss, future.',
    'stage must be one of: new, dating, long-term, long-distance.',
    'accent must be one of: rose, mist, amber, teal.',
    'icon must be a single emoji that matches the theme mood.',
    'Do NOT repeat themes from history. Pick a fresh angle based on their stage and world progress.',
    `Current week key: ${weekKey}`,
    `Relationship stage: ${stage}`,
    `Last exploration: ${lastExploreDays < 0 ? 'never' : lastExploreDays === 0 ? 'today' : `${lastExploreDays} days ago`}`,
    `World region progress: ${JSON.stringify(worldProgress)}`,
    `Recent exploration questions (avoid repeating themes): ${history.join(' | ') || 'none'}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 500);

  const VALID_GOALS = ['know', 'icebreak', 'common', 'connect', 'fresh', 'deep', 'habit', 'needs', 'review', 'sync', 'miss', 'future'];
  const VALID_STAGES = ['new', 'dating', 'long-term', 'long-distance'];
  const VALID_ACCENTS = ['rose', 'mist', 'amber', 'teal'];

  const goal = typeof parsed.goal === 'string' && VALID_GOALS.includes(parsed.goal) ? parsed.goal : 'deep';
  const themeStage = typeof parsed.stage === 'string' && VALID_STAGES.includes(parsed.stage) ? parsed.stage : 'long-term';
  const accent = typeof parsed.accent === 'string' && VALID_ACCENTS.includes(parsed.accent) ? parsed.accent : 'mist';
  const icon = asString(parsed.icon, '🎁').slice(0, 4);

  const title = parsed.title && typeof parsed.title === 'object' ? parsed.title as Record<string, unknown> : {};
  const description = parsed.description && typeof parsed.description === 'object' ? parsed.description as Record<string, unknown> : {};
  const momentText = parsed.momentText && typeof parsed.momentText === 'object' ? parsed.momentText as Record<string, unknown> : {};

  return {
    icon,
    title: {
      cn: asString(title.cn, '本周主题'),
      en: asString(title.en, 'This Week\'s Theme'),
    },
    description: {
      cn: asString(description.cn, '一份为你准备的探索主题，点开看看。'),
      en: asString(description.en, 'A curated exploration theme is ready for you.'),
    },
    goal,
    stage: themeStage,
    momentText: {
      cn: asString(momentText.cn, '此刻我们在一起，准备开始一次新的探索。'),
      en: asString(momentText.en, 'We are together now, ready to begin a new exploration.'),
    },
    accent,
  };
}

async function generateReminder(body: ApiBody) {
  const days = Number(body.days ?? 0);
  const stage = asString(body.stage, 'unknown');
  const lastGoal = asString(body.lastGoal);
  const history = Array.isArray(body.history) ? body.history.filter((item): item is string => typeof item === 'string').slice(-3) : [];

  const prompt = [
    'You are Love Atlas, a gentle relationship exploration assistant.',
    'Generate a short, warm reminder to invite the user back for a new exploration.',
    'The reminder should feel personal, not pushy. Like a friend gently tapping their shoulder.',
    'Return JSON only with this format:',
    '{"title":{"cn":"中文标题（8-14字）","en":"English title (4-8 words)"},"body":{"cn":"中文正文（20-40字，温暖具体）","en":"English body (15-25 words)"}}',
    `Days since last exploration: ${days}`,
    `Relationship stage: ${stage}`,
    `Last exploration goal: ${lastGoal || 'unknown'}`,
    `Recent topics: ${history.join(' | ') || 'none'}`,
    'If days is 0: invite them to try again today. If days is 1-3: encourage continuity. If days > 3: gentle reconnection, no guilt.',
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 300);
  const title = parsed.title && typeof parsed.title === 'object' ? parsed.title as Record<string, unknown> : {};
  const bodyText = parsed.body && typeof parsed.body === 'object' ? parsed.body as Record<string, unknown> : {};

  return {
    title: {
      cn: asString(title.cn, days === 0 ? '今天还没有聊聊心事' : days <= 3 ? `已经 ${days} 天没有探索了` : `已经 ${days} 天了，该回来了`),
      en: asString(title.en, days === 0 ? 'No heart-to-heart today yet' : days <= 3 ? `It has been ${days} days` : `It has been ${days} days — time to come back`),
    },
    body: {
      cn: asString(bodyText.cn, '花几分钟，和对方来一次轻松的探索吧。'),
      en: asString(bodyText.en, 'Take a few minutes for a light exploration together.'),
    },
  };
}

async function generateMomentInfluence(body: ApiBody) {
  const text = asString(body.text);
  const scene = asString(body.scene);
  const imageTags = Array.isArray(body.imageTags) ? body.imageTags.filter((t): t is string => typeof t === 'string') : [];

  if (!text && !scene && imageTags.length === 0) {
    return { primaryArea: 'forest', reason: '此刻没有足够信息，默认加入情绪森林。', weight: 0.5 };
  }

  const prompt = [
    'You are Love Atlas, a gentle relationship exploration assistant.',
    'The user described their present moment. Based on their text, scene, and image tags, determine which map area should be added to their exploration route.',
    'Return JSON only with this format:',
    '{"primaryArea":"forest或coast或valley或city或garden","reason":"中文，15-30字，解释为什么加入这个区域","weight":0.5到0.8之间的数字}',
    'Area meanings: forest=情绪表达, coast=回忆, valley=日常, city=未来方向, garden=边界理解',
    'Weight reflects how strongly this moment should influence the route (0.5=weak, 0.8=strong).',
    `Scene: ${scene || 'unknown'}`,
    `Text: ${text.slice(0, 300) || 'none'}`,
    `Image tags: ${imageTags.join(', ') || 'none'}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 300);
  const VALID_AREAS = ['forest', 'coast', 'valley', 'city', 'garden'];
  const area = typeof parsed.primaryArea === 'string' && VALID_AREAS.includes(parsed.primaryArea) ? parsed.primaryArea : 'forest';
  const weight = typeof parsed.weight === 'number' && parsed.weight >= 0.5 && parsed.weight <= 0.8 ? parsed.weight : 0.6;

  return {
    primaryArea: area,
    reason: asString(parsed.reason, '此刻的场景影响了你们的探索路线。'),
    weight,
  };
}

async function generateCompanionAnswer(body: ApiBody) {
  const question = asString(body.question);
  const userAnswer = asString(body.answerA);
  const stage = asString(body.stage, 'dating');
  const goal = asString(body.goal, 'know');
  const questionIndex = Number(body.questionIndex ?? 0);

  const prompt = [
    'You are a virtual companion in Love Atlas, helping a reviewer experience the full flow without a real partner.',
    'Generate a warm, realistic answer as if you were the partner in this relationship.',
    'Your answer should feel genuine — not too perfect, not too short. Like a real person who cares.',
    'Return JSON only with this format:',
    '{"answer":"中文回答（30-120字，像真实伴侣的口吻）","ready":true}',
    'Keep the tone warm but natural. Vary length based on the question — some answers can be short, some longer.',
    `Relationship stage: ${stage}`,
    `Goal: ${goal}`,
    `Question index: ${questionIndex}`,
    `Question: ${question}`,
    `Partner (user) answered: ${userAnswer.slice(0, 400) || '(still thinking)'}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 400);
  return {
    answer: asString(parsed.answer, '我也在想这个问题。说实话，我也没有完全想清楚，但和你一起聊让我觉得安心。'),
    ready: typeof parsed.ready === 'boolean' ? parsed.ready : true,
  };
}

export async function handleAiJourneyApi(request: IncomingMessage, response: ServerResponse) {
  const path = request.url ? new URL(request.url, 'http://localhost').pathname : '';
  if (!path.startsWith('/api/ai/question') && !path.startsWith('/api/ai/summary') && !path.startsWith('/api/ai/coach') && !path.startsWith('/api/ai/theme') && !path.startsWith('/api/ai/insights') && !path.startsWith('/api/ai/reminder') && path !== '/api/ai/moment' && !path.startsWith('/api/ai/companion')) return false;
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return true;
    }
    const body = await readBody(request);
    const result = path.startsWith('/api/ai/question')
      ? await generateQuestion(body)
      : path.startsWith('/api/ai/coach')
        ? await generateCoach(body)
        : path.startsWith('/api/ai/theme')
          ? await generateTheme(body)
          : path.startsWith('/api/ai/insights')
            ? await generateInsights(body)
            : path.startsWith('/api/ai/reminder')
              ? await generateReminder(body)
              : path === '/api/ai/moment'
                ? await generateMomentInfluence(body)
                : path.startsWith('/api/ai/companion')
                  ? await generateCompanionAnswer(body)
                  : await generateSummary(body);
    sendJson(response, 200, result);
    return true;
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'AI journey generation failed' });
    return true;
  }
}
