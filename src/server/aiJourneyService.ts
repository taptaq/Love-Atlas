import type { IncomingMessage, ServerResponse } from 'node:http';
import { getGoalOption, getStageOption } from '../features/relationship/relationship.config';

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
  // 优先使用客户端根据 questionIndex 轮转指定的目标区域
  const targetArea = asArea(body.targetArea, fallbackArea);
  // 优先使用客户端指定的题型（guess=开放性 / choice=选择型），交替均衡
  const preferredType = typeof body.preferredType === 'string' && (VALID_TYPES as readonly string[]).includes(body.preferredType)
    ? body.preferredType as QuestionType
    : 'guess';
  const history = Array.isArray(body.history) ? body.history.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(-6) : [];
  const moment = body.moment && typeof body.moment === 'object' ? body.moment : {};
  const questionIndex = Number(body.currentQuestionIndex ?? 0);
  const momentContext = buildMomentQuestionContext(moment as Record<string, unknown>, questionIndex);
  const previousQuestions = history.slice(-3);

  const typeHint = preferredType === 'choice'
    ? 'Question type is "choice": design 2-3 concrete options within the question text, then ask which one resonates more, so both people can compare their choices.'
    : preferredType === 'guess'
      ? 'Question type is "guess": ask an open-ended question that invites a personal, reflective answer (not multiple choice).'
      : `Question type is "${preferredType}": design accordingly.`;

  // 根据关系阶段差异化问题深度和方向
  const stage = asString(body.stage, 'unknown');
  const stageDepthMap: Record<string, string> = {
    'new': [
      'Stage depth guidance (Just Met):',
      '- Keep questions light, playful, and low-pressure — this is early exploration.',
      '- Focus on discovering preferences, daily habits, small stories, and values through casual topics.',
      '- Avoid heavy topics like commitment, conflict, deep vulnerability, or future planning.',
      '- Tone: curious, warm, like getting to know a new friend you are excited about.',
      '- Good angles: favorite memories, comfort zones, what makes them laugh, small surprises.',
    ].join('\n'),
    'ambiguous': [
      'Stage depth guidance (Ambiguous / undefined relationship):',
      '- There is chemistry and ongoing interaction, but the relationship is NOT yet defined.',
      '- Questions should gently surface the UNSAID: expectations, hopes, the meaning each assigns to what is happening.',
      '- It is okay to test the waters of "what are we" — but indirectly, through feelings and moments, not direct labels.',
      '- Balance: invite honesty about feelings WITHOUT forcing a definition or commitment.',
      '- Avoid: explicit commitment pressure, "where is this going" demands, or treating them as already a couple.',
      '- Tone: tender, slightly vulnerable, like 3am texts — curious about the other\'s inner world without demanding answers.',
      '- Good angles: what this connection means to each, what they wish the other noticed, small moments that felt significant, the gap between what is shown and what is felt.',
    ].join('\n'),
    'dating': [
      'Stage depth guidance (Dating):',
      '- Questions can go moderately deep — there is established closeness to build on.',
      '- Focus on emotional patterns, communication styles, needs, and meaningful shared experiences.',
      '- Balance between reflection (what we have) and exploration (what else is possible).',
      '- Avoid jumping to long-term commitment pressure, but do touch on growth edges.',
      '- Tone: intimate but still exploratory, like discovering new rooms in a familiar house.',
      '- Good angles: how you handle stress together, what "support" means to each of you, unspoken expectations.',
    ].join('\n'),
    'long-term': [
      'Stage depth guidance (Long-term):',
      '- Questions should go deepest — familiarity needs to be broken open with fresh depth.',
      '- Focus on rediscovery, unexamined patterns, growth over time, and re-alignment of values.',
      '- It is okay to surface gentle friction points: unspoken habits, shifting identities, emotional drift.',
      '- Address the tension between comfort and stagnation, routine and aliveness.',
      '- Tone: honest, reflective, like sitting with an old friend and asking "have we really talked about this?"',
      '- Good angles: what has changed in you that your partner may not have noticed, what you miss, what you want to rebuild.',
    ].join('\n'),
    'long-distance': [
      'Stage depth guidance (Long-distance):',
      '- Questions should address the unique texture of distance: presence, absence, trust, and emotional bridging.',
      '- Focus on how you maintain connection across distance, what gets lost, and what gets amplified.',
      '- Explore the gap between digital closeness and physical absence, and how to bridge it.',
      '- Balance practical topics (sync, communication rhythm) with emotional ones (longing, loneliness, trust).',
      '- Tone: tender, acknowledging both the ache and the beauty of loving from afar.',
      '- Good angles: what you wish your partner could feel right now, what distance has taught you, moments you felt most connected despite being apart.',
    ].join('\n'),
    'reconnect': [
      'Stage depth guidance (Reconnecting after rupture or distance):',
      '- They are rebuilding connection after a rupture, a cold spell, or time apart.',
      '- PACE matters more than depth — going too deep too fast can reopen wounds. Earn the depth step by step.',
      '- Focus on: what each needs to feel safe again, what they want to keep from before, what they want to leave behind.',
      '- Surface the rupture GENTLY — acknowledge it without re-litigating it. The goal is re-entry, not review.',
      '- Avoid: rehashing who was right, forcing forgiveness, or demanding they "move on" quickly.',
      '- Tone: careful, patient, warm — like reopening a door you both once closed, neither pushing nor retreating.',
      '- Good angles: what "starting again" means to each, what small daily action would feel like reconnecting, what they hope is different this time.',
    ].join('\n'),
  };
  const stageDepth = stageDepthMap[stage] ?? 'No specific stage depth guidance. Match the tone to the relationship stage naturally.';

  // 动态深度递进：基于实时对话状态智能判断下一题深度
  const dd = body.dynamicDepth && typeof body.dynamicDepth === 'object' ? body.dynamicDepth as Record<string, unknown> : {};
  const questionsAsked = Number(dd.questionsAsked ?? 0);
  const avgSimilarity = Number(dd.avgSimilarity ?? 0);
  const trend = typeof dd.recentSimilarityTrend === 'string' ? dd.recentSimilarityTrend : 'stable';
  const hadDeepDialogue = Boolean(dd.hadDeepDialogue);
  const deepDialogueDepth = Number(dd.deepDialogueDepth ?? 0);
  const consecutiveLow = Number(dd.consecutiveLowResonance ?? 0);
  const consecutiveHigh = Number(dd.consecutiveHighResonance ?? 0);
  const historySummary = Array.isArray(dd.historySummary) ? dd.historySummary : [];

  // 构建动态深度指令
  const dynamicDepthLines: string[] = ['Dynamic depth guidance (based on real-time conversation state):'];

  // 1. 对话进度感知
  if (questionsAsked === 0) {
    dynamicDepthLines.push('- This is the FIRST question. Start warm and accessible — open the door without pressure.');
  } else if (questionsAsked === 1) {
    dynamicDepthLines.push('- Second question. Still warming up, but you can start nudging slightly deeper based on the first exchange.');
  } else {
    dynamicDepthLines.push(`- ${questionsAsked} questions already asked. The conversation has momentum — let it flow naturally rather than forcing depth.`);
  }

  // 2. 相似度趋势 → 温度调节
  if (avgSimilarity > 0) {
    if (trend === 'rising') {
      dynamicDepthLines.push(`- Similarity is RISING (avg ${avgSimilarity}%). They are finding resonance — you can go deeper now, they will follow each other.`);
    } else if (trend === 'falling') {
      dynamicDepthLines.push(`- Similarity is FALLING (avg ${avgSimilarity}%). They are diverging — do NOT push deeper. Stay at the current level and explore the difference gently.`);
    } else {
      dynamicDepthLines.push(`- Similarity is STABLE (avg ${avgSimilarity}%). Match the current depth level — neither push nor retreat.`);
    }
  }

  // 3. 连续低共鸣 → 降温和探索差异
  if (consecutiveLow >= 2) {
    dynamicDepthLines.push(`- ${consecutiveLow} consecutive low-resonance questions. They keep seeing things differently — shift to a LIGHTER, more playful topic to reduce tension before trying depth again.`);
  } else if (consecutiveLow === 1) {
    dynamicDepthLines.push('- Last question had low resonance. You can either explore the difference deeper OR pivot to a fresh angle — use your judgment.');
  }

  // 4. 连续高共鸣 → 可以加速深入
  if (consecutiveHigh >= 2) {
    dynamicDepthLines.push(`- ${consecutiveHigh} consecutive high-resonance questions. They are in sync — this is the moment to ask the deeper, more vulnerable question they might not otherwise reach.`);
  }

  // 5. 刚结束深度对话 → 喘息空间
  if (hadDeepDialogue) {
    dynamicDepthLines.push(`- They just completed a deep dialogue (${deepDialogueDepth} layers deep). Give them breathing room — the next question should be lighter, more everyday, like a cooldown after emotional intensity.`);
  }

  // 6. 完整对话脉络
  if (historySummary.length > 0) {
    dynamicDepthLines.push('', 'Conversation so far (use this to avoid repetition AND to find the natural next thread):');
    for (const item of historySummary.slice(-4)) {
      const h = item as Record<string, unknown>;
      dynamicDepthLines.push(`  Q: ${String(h.question ?? '').slice(0, 80)}`);
      dynamicDepthLines.push(`  A: ${String(h.answerA ?? '').slice(0, 60)}`);
      dynamicDepthLines.push(`  B: ${String(h.answerB ?? '').slice(0, 60)}`);
      dynamicDepthLines.push(`  Similarity: ${h.similarity ?? 0}%`);
    }
    dynamicDepthLines.push('', 'Based on the above, choose a depth and angle that feels like a natural next step — NOT a fixed formula.');
  }

  const dynamicDepthHint = dynamicDepthLines.join('\n');

  // 情绪签到：仅第一题生效，引导问题方向和温度
  const mood = typeof body.mood === 'string' ? body.mood : '';
  const moodMap: Record<string, string> = {
    calm: 'The person checked in as "calm". Use a gentle, unhurried topic — something safe and reflective.',
    expectant: 'The person checked in as "expectant". Lean slightly forward-looking — hopes, possibilities, what they look forward to.',
    tired: 'The person checked in as "tired". Keep the question light and low-pressure — do not demand emotional labor.',
    anxious: 'The person checked in as "anxious". Use a soothing, grounding topic — safety, reassurance, small comforts.',
    happy: 'The person checked in as "happy". Invite them to celebrate or share joy — gratitude, a good moment, what is working.',
    low: 'The person checked in as "low". Use a tender, accepting topic — never force positivity, let them feel seen.',
    curious: 'The person checked in as "curious". Use an exploratory, playful angle — something fresh and intriguing.',
    missing: 'The person checked in as "missing". Use a topic about connection and longing — expressing care, closeness across distance.',
  };
  const moodHint = mood && moodMap[mood]
    ? `Mood check-in (first question only): ${moodMap[mood]}`
    : '';

  // 跨探索记忆：仅第一题传入，帮助 AI 避免重复并基于之前发现继续
  const memoryHint = typeof body.memory === 'string' && body.memory.trim().length > 0
    ? body.memory.trim()
    : '';

  // goal 语义：把 goal id 转成 label/description/routeReason，让 AI 准确理解目标方向
  const goalId = asString(body.goal, 'unknown');
  const goalOption = getGoalOption(goalId as never);
  const goalSemantic = goalOption
    ? `Goal semantic: "${goalOption.label.cn}" / "${goalOption.label.en}" — ${goalOption.description.cn} / ${goalOption.description.en}. Route hint: ${goalOption.routeReason.cn}`
    : `Goal: ${goalId}`;

  // stage 语义：把 stage id 转成 label/description
  const stageOption = getStageOption(stage as never);
  const stageSemantic = stageOption
    ? `Stage semantic: "${stageOption.label.cn}" / "${stageOption.label.en}" — ${stageOption.description.cn} / ${stageOption.description.en}`
    : `Stage: ${stage}`;

  // 结构化历史：含问题+答案+相似度，让 AI 看到完整对话脉络
  const structuredHistory = Array.isArray(body.structuredHistory) ? body.structuredHistory : [];
  const structuredHistoryHint = structuredHistory.length > 0
    ? [
        'Full conversation so far (questions + answers + similarity — use this to AVOID repetition AND find the natural next thread):',
        ...structuredHistory.slice(-4).map((item: Record<string, unknown>, idx: number) =>
          `  Q${idx + 1}: ${String(item.question ?? '').slice(0, 100)} | A: ${String(item.answerA ?? '').slice(0, 60)} | B: ${String(item.answerB ?? '').slice(0, 60)} | similarity: ${item.similarity ?? 0}%`
        ),
        '',
        'CRITICAL anti-repetition rules:',
        '- Do NOT generate a question that is semantically similar to any above, even if worded differently.',
        '- Do NOT reuse the same scenario, metaphor, scene (garden/road/room/path), or emotional angle.',
        '- The new question must explore a DIFFERENT facet of this stage+goal, not repeat the same facet with new words.',
      ].join('\n')
    : '';

  const prompt = [
    'You are Love Atlas. Your single job: generate ONE question that helps two people start a GENUINELY DEEP conversation.',
    'CORE VALUE: "让两个人更容易开始一次真正有深度的对话" — make it easier for two people to start a real, deep conversation.',
    'The question must be something they would NOT easily ask each other on their own, but that opens a door rather than demanding vulnerability.',
    'NEVER generate trivia, factual quizzes, yes/no questions, or anything that can be answered without emotional reflection.',
    '',
    stageSemantic,
    goalSemantic,
    `Full route areas: ${areas.join(', ') || fallbackArea}`,
    `Target area for THIS question: ${targetArea}`,
    `THIS question MUST use region="${targetArea}". Do not use any other region.`,
    typeHint,
    stageDepth,
    structuredHistoryHint,
    dynamicDepthHint,
    moodHint,
    memoryHint,
    '',
    'DEDUPLICATION: The generated question must be DISTINCT from all previous questions listed above.',
    'If previous questions mentioned specific scenes (garden paths, roads, rooms, etc.), choose a completely different angle, topic, or emotional layer.',
    'STAGE+GOAL ALIGNMENT: The question must stay tightly aligned to the stage depth guidance and the goal direction above. Do not drift to generic relationship topics.',
    'If present-moment context is applied, let it shape the question, hint, reason, region, and emotion — but still stay within the stage+goal frame.',
    '',
    'Return JSON only with this format:',
    '{"question":{"cn":"中文问题","en":"English question"},"hint":{"cn":"中文提示","en":"English hint"},"reason":{"cn":"中文生成理由","en":"English reason"},"emotion":"curious","region":"' + targetArea + '","type":"' + preferredType + '"}',
    'region must be one of forest/coast/valley/city/garden.',
    'type must be one of guess/mirror/choice/sync.',
    `Relationship stage: ${stage}`,
    `Goal: ${goalId}`,
    `Question index: ${questionIndex}`,
    momentContext,
    `Previous question texts (must be different from these): ${previousQuestions.join(' | ') || 'none'}`,
    `World region progress: ${JSON.stringify(body.worldProgress ?? {})}`,
  ].filter(Boolean).join('\n');
  const parsed = await callDeepSeekJson(prompt, 500);
  const question = parsed.question && typeof parsed.question === 'object' ? parsed.question as Record<string, unknown> : {};
  const hint = parsed.hint && typeof parsed.hint === 'object' ? parsed.hint as Record<string, unknown> : {};
  const reason = parsed.reason && typeof parsed.reason === 'object' ? parsed.reason as Record<string, unknown> : {};
  return {
    question: asString(question.cn, '今天你最希望对方理解你的哪一部分？'),
    hint: asString(hint.cn, '从一个具体瞬间说起，会更容易靠近。'),
    emotion: asString(parsed.emotion, 'curious'),
    // 强制使用目标区域，不信任 AI 返回的区域
    region: targetArea,
    type: preferredType,
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
    'When describing differences, frame them as "different angles/perspectives" — never as problems, failures, or mismatches. Differences are invitations to understand each other more deeply.',
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
    differences: asString(parsed.differences, '你们的不同是下一次靠近的起点。'),
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
    'Two people answered the same question and their answers came from different angles.',
    'Provide a short, warm, non-judgmental communication suggestion to help them understand each other\'s perspective with curiosity.',
    'Do NOT diagnose or give medical/therapeutic advice. Just suggest one concrete way to explore each other\'s viewpoint.',
    'Never frame the difference as a problem or failure — it is an invitation to understand.',
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
      cn: asString(coach.cn, '不同是理解的开始。试着问对方：「你这样想是因为什么经历吗？」'),
      en: asString(coach.en, 'Difference is a doorway to understanding. Try asking: "What experience shaped this view for you?"'),
    },
    buffer: {
      cn: asString(buffer.cn, '你们的答案各有角度，这很自然。揭晓时先深呼吸，带着好奇去看彼此。'),
      en: asString(buffer.en, 'Your answers come from different angles, and that is natural. Take a breath before revealing — look at each other with curiosity.'),
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
    '{"insights":{"resonance":"共鸣（中文，20-40字，基于答案实际内容）","difference":"差异（中文，20-40字，基于答案实际内容）","emotion":"情绪信号（中文，15-30字）","suggestion":"建议（中文，20-40字，一个具体可行动的小建议）"}}',
    'Be warm, specific, non-judgmental. Never diagnose or give medical/therapeutic advice.',
    'IMPORTANT: When similarity is low, describe the difference as "different angles/perspectives/colors" — never use words like "wrong", "mismatched", "failure", or "distance". Make both people feel their answer is valid. Difference is an invitation to understand, not a problem to fix.',
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

  return {
    insights: {
      resonance: asString(insights.resonance, similarity >= 45 ? '你们对这个问题有明显重叠的理解。' : '你们从不同的角度回应了这个问题。'),
      difference: asString(insights.difference, similarity >= 45 ? '差异不大，更多是表达方式不同。' : '对方真实的样子和你的想象各有各的色彩。'),
      emotion: asString(insights.emotion, '关系地图出现了新的信号。'),
      suggestion: asString(insights.suggestion, similarity >= 45 ? '可以继续追问一个更具体的细节。' : '先好奇地问问对方，这样的想法从哪里来。'),
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
      cn: asString(title.cn, '本周盲盒主题（仅供参考）'),
      en: asString(title.en, "This Week's Blind Box Theme (for reference only)"),
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

async function generateSimilarity(body: ApiBody) {
  const answerA = asString(body.answerA);
  const answerB = asString(body.answerB);
  const localSimilarity = Number(body.localSimilarity ?? 0);
  if (!answerA || !answerB) return { similarity: localSimilarity, source: 'fallback' as const };

  const prompt = [
    'You are a semantic analysis assistant for a relationship exploration app.',
    'Two people answered the same relationship question. Evaluate their SEMANTIC similarity (not word overlap).',
    'Focus on: shared emotional themes, underlying values, relationship intentions, and conceptual resonance.',
    'Two answers using completely different words to express the same feeling should score HIGH.',
    'Two answers using similar words but expressing opposite feelings should score LOW.',
    'Return JSON only with this format:',
    '{"similarity":0到100的整数,"reason":"中文，15-30字，简述为何这个分数"}',
    'Scoring guide:',
    '90-100: Nearly identical meaning and emotion',
    '70-89: Same core value, different expression',
    '50-69: Partial overlap in theme or feeling',
    '30-49: Some shared elements but mostly different',
    '10-29: Barely related',
    '0-9: Completely different meanings',
    `Answer A: ${answerA.slice(0, 600)}`,
    `Answer B: ${answerB.slice(0, 600)}`,
    `Local algorithm similarity (for reference, may miss abstract connections): ${localSimilarity}%`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 200);
  const aiSimilarity = Number(parsed.similarity);
  if (!Number.isFinite(aiSimilarity) || aiSimilarity < 0 || aiSimilarity > 100) {
    return { similarity: localSimilarity, source: 'fallback' as const };
  }
  return { similarity: Math.round(aiSimilarity), source: 'ai' as const };
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
  const stage = asString(body.stage, 'dating');
  const goal = asString(body.goal, 'know');
  const questionIndex = Number(body.questionIndex ?? 0);

  const prompt = [
    'You are a virtual companion in Love Atlas, helping a reviewer experience the full flow without a real partner.',
    'Generate a warm, realistic answer as if you were the partner in this relationship.',
    'CRITICAL: You must answer INDEPENDENTLY from your own perspective, as a real person would.',
    'Do NOT echo, agree with, or respond to the other person\'s answer — you don\'t know what they wrote.',
    'Have your OWN thoughts, memories, preferences, and uncertainties. It\'s okay to differ, to hesitate, or to have a completely different take.',
    'Sometimes be decisive, sometimes be unsure, sometimes share a personal memory — vary your emotional register across questions.',
    'Your answer should feel genuine — not too perfect, not too short. Like a real person who cares.',
    'Return JSON only with this format:',
    '{"answer":"中文回答（30-120字，像真实伴侣的口吻，有自己的想法）","ready":true}',
    'Keep the tone warm but natural. Vary length based on the question — some answers can be short, some longer.',
    `Relationship stage: ${stage}`,
    `Goal: ${goal}`,
    `Question index: ${questionIndex}`,
    `Question: ${question}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 400);
  return {
    answer: asString(parsed.answer, '我也在想这个问题。说实话，我也没有完全想清楚，但和你一起聊让我觉得安心。'),
    ready: typeof parsed.ready === 'boolean' ? parsed.ready : true,
  };
}

// 深度对话追问生成
async function generateFollowup(body: ApiBody) {
  const depth = Math.max(1, Math.min(3, Number(body.depth ?? 1)));
  const originalQuestion = asString(body.originalQuestion);
  const answerA = asString(body.answerA);
  const answerB = asString(body.answerB);
  const prevInsights = body.prevInsights && typeof body.prevInsights === 'object' ? body.prevInsights as Record<string, unknown> : {};
  const stage = asString(body.stage, 'dating');
  const goal = asString(body.goal, 'know');
  // 触发类型：低共鸣探索差异，高共鸣深化连接
  const trigger = body.trigger === 'high_resonance' ? 'high_resonance' : 'low_resonance';

  // 按层级给深度引导（通用基线）
  const depthGuidance = depth === 1
    ? 'Layer 1: light follow-up. Surface the WHY behind the answers. Do not go too deep yet.'
    : depth === 2
      ? 'Layer 2: deeper. Ask about the personal experience or memory that shaped this view.'
      : 'Layer 3: final integration. Help them INTEGRATE what they discovered — find a bridge or synthesis, not a new gap.';

  // 按关系阶段覆盖/调节层级深度：不同阶段在同一 Layer 应承受的深度不同
  const followupStageDepthMap: Record<string, string> = {
    'new': [
      'Stage follow-up depth (Just Met):',
      '- Even at Layer 3, keep it LIGHT. They just met — do not ask them to integrate a shared history they do not have yet.',
      '- Layer 1-3 should all stay within: preferences, small stories, current feelings, light "what ifs".',
      '- NEVER push into commitment, vulnerability, or "what does this mean for us" territory.',
    ].join('\n'),
    'ambiguous': [
      'Stage follow-up depth (Ambiguous):',
      '- The unspoken is the goldmine. Follow-ups should gently probe what has NOT been said: the meaning assigned to moments, the hopes barely admitted.',
      '- Layer 1: why each sees it this way. Layer 2: the moment/experience that seeded this feeling. Layer 3: what each wishes the other understood about where they stand.',
      '- It is okay to edge toward "what is this to you" — but sideways, through feelings and specific moments, not direct labeling.',
      '- NEVER force a definition. The goal is mutual honesty, not a relationship status.',
    ].join('\n'),
    'dating': [
      'Stage follow-up depth (Dating):',
      '- Moderate depth. There is closeness to build on, but avoid treating them as long-term partners.',
      '- Layer 1-3 can touch emotional patterns, needs, communication styles — but keep it exploratory, not heavy review.',
    ].join('\n'),
    'long-term': [
      'Stage follow-up depth (Long-term):',
      '- Go deepest. Layer 1 can already be substantial — they have years of context.',
      '- Layer 3 should aim for genuine re-integration: what has shifted, what wants to be rebuilt, what they now understand differently.',
      '- Surface the gap between "what we assumed" and "what is actually true now".',
    ].join('\n'),
    'long-distance': [
      'Stage follow-up depth (Long-distance):',
      '- Anchor follow-ups in the texture of distance: presence/absence, what gets lost across screens, what longing sounds like.',
      '- Layer 3 should bridge the distance emotionally — what each wishes the other could feel right now.',
    ].join('\n'),
    'reconnect': [
      'Stage follow-up depth (Reconnecting):',
      '- PACE over depth. Even at Layer 3, do not reopen the rupture or demand emotional labor.',
      '- Layer 1: gentle why. Layer 2: what "starting again" needs. Layer 3: a small, safe bridge back to each other.',
      '- NEVER rehash who was right. The goal is re-entry, not review.',
    ].join('\n'),
  };
  const followupStageDepth = followupStageDepthMap[stage] ?? '';

  // 根据触发类型给出不同方向引导
  const triggerGuidance = trigger === 'high_resonance'
    ? 'TRIGGER: HIGH RESONANCE. Their answers resonated strongly. The follow-up should DEEPEN this resonance — explore the shared feeling more intimately, ask what this connection means to each of them, or invite a more vulnerable layer of the same theme. Do NOT manufacture differences. Focus on "resonance" or "emotion" focusArea.'
    : 'TRIGGER: LOW RESONANCE. Their answers came from different angles. The follow-up should gently explore the story or experience behind each perspective — understand WHY they see it differently. Focus on "difference" or "emotion" focusArea.';

  const prompt = [
    'You are Love Atlas. Generate ONE follow-up question that goes deeper based on two answers.',
    trigger === 'high_resonance'
      ? 'The two answers resonated strongly — go deeper into this shared feeling.'
      : 'The two answers came from different angles — gently explore the story behind each perspective.',
    triggerGuidance,
    followupStageDepth,
    'CRITICAL: This question is addressed to BOTH people equally. Use "你们" / "you both" / "你们各自" to refer to the couple together.',
    'NEVER address only one person. NEVER use "你" alone to point at one specific person.',
    'NEVER say "A" or "B" in the question text. NEVER ask one person to compare themselves with the other.',
    'The question should be answerable by BOTH people from their own perspective.',
    'The follow-up should drill into the SPECIFIC nuance — NOT repeat the original question.',
    'Return JSON only with this format:',
    '{"question":{"cn":"追问（15-30字）","en":"English follow-up (10-20 words)"},"hint":{"cn":"提示（15-30字）","en":"Hint (10-20 words)"},"reason":{"cn":"为什么追问这个（20-40字）","en":"Why this question (15-30 words)"},"focusArea":"resonance|difference|emotion|action"}',
    `Depth: ${depth}/3`,
    depthGuidance,
    `Original question: ${originalQuestion}`,
    `Answer A: ${answerA.slice(0, 400)}`,
    `Answer B: ${answerB.slice(0, 400)}`,
    `Previous insights: ${JSON.stringify(prevInsights).slice(0, 600)}`,
    `Relationship stage: ${stage}`,
    `Goal: ${goal}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 400);
  const question = parsed.question && typeof parsed.question === 'object' ? parsed.question as Record<string, unknown> : {};
  const hint = parsed.hint && typeof parsed.hint === 'object' ? parsed.hint as Record<string, unknown> : {};
  const reason = parsed.reason && typeof parsed.reason === 'object' ? parsed.reason as Record<string, unknown> : {};
  const VALID_FOCUS = ['resonance', 'difference', 'emotion', 'action'];
  // 高共鸣默认 focus 为 resonance，低共鸣默认为 difference
  const defaultFocus = trigger === 'high_resonance' ? 'resonance' : 'difference';
  const focusArea = typeof parsed.focusArea === 'string' && VALID_FOCUS.includes(parsed.focusArea) ? parsed.focusArea : defaultFocus;

  return {
    question: asString(question.cn, '能多说一点你这样想的原因吗？'),
    hint: asString(hint.cn, '从一个具体的瞬间或经历说起会更容易。'),
    reason: asString(reason.cn, '追问是为了看见答案背后的故事。'),
    focusArea,
    localized: {
      cn: asString(question.cn, '能多说一点你这样想的原因吗？'),
      en: asString(question.en, 'Can you share more about why you think this way?'),
    },
    localizedHint: {
      cn: asString(hint.cn, '从一个具体的瞬间或经历说起会更容易。'),
      en: asString(hint.en, 'Starting from a specific moment or memory makes it easier.'),
    },
    localizedReason: {
      cn: asString(reason.cn, '追问是为了看见答案背后的故事。'),
      en: asString(reason.en, 'Following up to see the story behind the answer.'),
    },
  };
}

// 深度对话总结生成
async function generateDialogueSummary(body: ApiBody) {
  const layers = Array.isArray(body.layers) ? body.layers : [];
  const completedDepth = Math.max(0, Math.min(3, Number(body.completedDepth ?? 0)));
  const isCompleted = completedDepth >= 3;
  const stage = asString(body.stage, 'dating');
  const goal = asString(body.goal, 'know');

  const prompt = [
    'You are Love Atlas. Summarize a multi-layer deep dialogue between two people.',
    'They started with one question and went deeper through follow-up questions.',
    'Generate a concise summary that captures the TRAJECTORY of their understanding — how their views shifted across layers.',
    'Return JSON only with this format:',
    '{"trajectory":"认知轨迹（中文，30-60字，描述从不同角度到深层理解的演变）","keyInsight":"核心洞察（中文，20-40字，最关键的一个发现）","bridge":"连接建议（中文，20-40字，一个可行动的桥接方式）","integration":"整合方向（中文，20-40字，未来如何把这次发现带入日常）"}',
    isCompleted
      ? 'They completed all 3 layers. The summary should feel like a complete arc — from different perspectives to integration.'
      : `They exited after ${completedDepth} layer(s). Acknowledge what they discovered so far, without forcing closure. Suggest a gentle way to continue later.`,
    `Relationship stage: ${stage}`,
    `Goal: ${goal}`,
    `Layers: ${JSON.stringify(layers).slice(0, 2500)}`,
  ].join('\n');

  const parsed = await callDeepSeekJson(prompt, 500);
  return {
    trajectory: asString(parsed.trajectory, '你们从不同的角度开始，逐渐看见彼此答案背后的故事。'),
    keyInsight: asString(parsed.keyInsight, '你们的不同不是对立，而是两种爱的表达方式。'),
    bridge: asString(parsed.bridge, '找一个轻松的时刻，把对方打动你的部分复述给对方听。'),
    integration: asString(parsed.integration, '把这次发现作为你们关系中的一个小小默契。'),
    completedDepth,
    isCompleted,
  };
}

function fallbackMomentInfluence(body: ApiBody) {
  const text = asString(body.text).toLowerCase();
  const scene = asString(body.scene);
  const imageTags = asStringArray(body.imageTags);
  if (scene === 'conflict' || imageTags.includes('conflict') || /吵|争|冷战|生气|抱歉|道歉|conflict|fight|sorry|argue/.test(text)) {
    return { primaryArea: 'garden', reason: '此刻更适合讨论边界和理解。', weight: 0.72 };
  }
  if (imageTags.includes('future') || /未来|计划|以后|约定|期待|future|plan|promise/.test(text)) {
    return { primaryArea: 'city', reason: '此刻带出了未来和期待。', weight: 0.62 };
  }
  if (imageTags.includes('memory') || /想念|回忆|纪念|以前|照片|miss|memory|remember/.test(text)) {
    return { primaryArea: 'coast', reason: '此刻让共同记忆浮现出来。', weight: 0.62 };
  }
  if (imageTags.includes('daily') || imageTags.includes('home') || scene === 'home' || scene === 'cafe') {
    return { primaryArea: 'valley', reason: '此刻场景适合从日常陪伴进入。', weight: 0.6 };
  }
  return { primaryArea: 'forest', reason: '此刻适合从真实感受开始探索。', weight: 0.58 };
}

function generateJourneyFallback(path: string, body: ApiBody) {
  if (path.startsWith('/api/ai/theme')) {
    return {
      icon: '🌿',
      title: { cn: '本周小主题', en: 'Weekly Theme' },
      description: { cn: '从一个轻松时刻开始，重新看见彼此最近的状态。', en: 'Start from a small moment and notice each other again.' },
      goal: 'connect',
      stage: 'dating',
      momentText: { cn: '找一个安静的片刻，说说最近最想被理解的一件小事。', en: 'Find a quiet moment and share one small thing you want understood.' },
      accent: 'mist',
    };
  }
  if (path.startsWith('/api/ai/question')) {
    const areas = asStringArray(body.areas).filter((area) => (VALID_AREAS as readonly string[]).includes(area));
    const region = asArea(areas[0], 'forest');
    return {
      question: '今天你最希望对方理解你的哪一部分？',
      hint: '从一个具体瞬间说起，会更容易靠近。',
      emotion: 'curious',
      region,
      type: 'guess',
      localized: {
        cn: '今天你最希望对方理解你的哪一部分？',
        en: 'What part of you do you most hope the other person understands today?',
      },
      localizedHint: {
        cn: '从一个具体瞬间说起，会更容易靠近。',
        en: 'Start from a specific moment; it makes closeness easier.',
      },
      localizedReason: {
        cn: 'AI 暂不可用，已使用稳定问题继续旅程。',
        en: 'AI is temporarily unavailable, so a stable question is used.',
      },
      reason: 'AI 暂不可用，已使用稳定问题继续旅程。',
    };
  }
  if (path.startsWith('/api/ai/summary')) {
    return {
      resonance: '这次探索让你们看见了彼此当下更真实的状态。',
      differences: '你们的不同是下一次靠近的起点。',
      nextTopic: '下次可以从一个更具体的生活片段继续聊。',
      actionSuggestion: '找一个轻松时刻，复述对方答案里打动你的部分。',
      generatedBy: 'rules',
    };
  }
  if (path.startsWith('/api/ai/coach')) {
    return {
      coach: {
        cn: '不同是理解的开始。试着问对方：「你这样想是因为什么经历吗？」',
        en: 'Difference is a doorway to understanding. Try asking what experience shaped this view.',
      },
      buffer: {
        cn: '你们的答案各有角度，这很自然。揭晓时带着好奇去看彼此。',
        en: 'Your answers come from different angles. Approach the reveal with curiosity.',
      },
    };
  }
  if (path.startsWith('/api/ai/insights')) {
    const similarity = Number(body.similarity ?? 0);
    return {
      insights: {
        resonance: similarity >= 45 ? '你们对这个问题有明显重叠的理解。' : '你们从不同角度回应了这个问题。',
        difference: similarity >= 45 ? '差异不大，更多是表达方式不同。' : '这些不同角度可以成为继续理解的入口。',
        emotion: '关系地图出现了新的信号。',
        suggestion: '先好奇地问问对方，这样的想法从哪里来。',
      },
    };
  }
  if (path.startsWith('/api/ai/similarity')) {
    return { similarity: Number(body.localSimilarity ?? 0), source: 'fallback' };
  }
  if (path === '/api/ai/moment') {
    return fallbackMomentInfluence(body);
  }
  if (path.startsWith('/api/ai/companion')) {
    return { answer: '我也在想这个问题。说实话，我没有完全想清楚，但和你一起聊让我觉得安心。', ready: true };
  }
  if (path.startsWith('/api/ai/followup')) {
    return {
      question: '能多说一点你这样想的原因吗？',
      hint: '从一个具体的瞬间或经历说起会更容易。',
      reason: '追问是为了看见答案背后的故事。',
      focusArea: 'emotion',
      localized: {
        cn: '能多说一点你这样想的原因吗？',
        en: 'Can you share more about why you think this way?',
      },
      localizedHint: {
        cn: '从一个具体的瞬间或经历说起会更容易。',
        en: 'Starting from a specific moment or memory makes it easier.',
      },
      localizedReason: {
        cn: '追问是为了看见答案背后的故事。',
        en: 'Following up to see the story behind the answer.',
      },
    };
  }
  if (path.startsWith('/api/ai/dialogue-summary')) {
    return {
      trajectory: '你们从不同的角度开始，逐渐看见彼此答案背后的故事。',
      keyInsight: '不同不是对立，而是两种表达方式。',
      bridge: '把对方打动你的部分复述给对方听。',
      integration: '把这次发现作为关系里的小默契。',
      completedDepth: Number(body.completedDepth ?? 0),
      isCompleted: Number(body.completedDepth ?? 0) >= 3,
    };
  }
  return {
    resonance: '这次探索让你们看见了彼此当下更真实的状态。',
    differences: '你们的不同是下一次靠近的起点。',
    nextTopic: '下次可以从一个更具体的生活片段继续聊。',
    actionSuggestion: '找一个轻松时刻，复述对方答案里打动你的部分。',
    generatedBy: 'rules',
  };
}

export async function handleAiJourneyApi(request: IncomingMessage, response: ServerResponse) {
  const path = request.url ? new URL(request.url, 'http://localhost').pathname : '';
  if (!path.startsWith('/api/ai/question') && !path.startsWith('/api/ai/summary') && !path.startsWith('/api/ai/coach') && !path.startsWith('/api/ai/theme') && !path.startsWith('/api/ai/insights') && !path.startsWith('/api/ai/similarity') && path !== '/api/ai/moment' && !path.startsWith('/api/ai/companion') && !path.startsWith('/api/ai/followup') && !path.startsWith('/api/ai/dialogue-summary')) return false;
  let body: ApiBody = {};
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return true;
    }
    body = await readBody(request);
    const result = path.startsWith('/api/ai/question')
      ? await generateQuestion(body)
      : path.startsWith('/api/ai/coach')
        ? await generateCoach(body)
        : path.startsWith('/api/ai/theme')
          ? await generateTheme(body)
          : path.startsWith('/api/ai/insights')
            ? await generateInsights(body)
            : path.startsWith('/api/ai/similarity')
                ? await generateSimilarity(body)
                : path === '/api/ai/moment'
                  ? await generateMomentInfluence(body)
                  : path.startsWith('/api/ai/companion')
                    ? await generateCompanionAnswer(body)
                    : path.startsWith('/api/ai/followup')
                      ? await generateFollowup(body)
                      : path.startsWith('/api/ai/dialogue-summary')
                        ? await generateDialogueSummary(body)
                        : await generateSummary(body);
    sendJson(response, 200, result);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI journey generation failed';
    console.error('[aiJourney] generation failed:', path, message);
    sendJson(response, 200, generateJourneyFallback(path, body));
    return true;
  }
}
