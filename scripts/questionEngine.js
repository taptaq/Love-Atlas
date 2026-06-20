/**
 * Love Atlas - 动态问题生成引擎 (Question Engine)
 * 基于规则生成，接口设计为未来可替换模型
 */

// ============================================
// 一、常量定义
// ============================================

// 关系阶段定义
const STAGES = {
    ambiguous: { cn: '暧昧期', en: 'Ambiguous' },
    love: { cn: '热恋期', en: 'In Love' },
    long_term: { cn: '长期关系', en: 'Long Term' },
    long_distance: { cn: '异地恋', en: 'Long Distance' },
    reconnect: { cn: '重新靠近', en: 'Reconnect' }
};

// 探索目标定义
const GOALS = {
    understand: { cn: '了解彼此', en: 'Understand Each Other' },
    rediscover: { cn: '重新发现', en: 'Rediscover' },
    express: { cn: '表达期待', en: 'Express Expectations' },
    future: { cn: '探索未来', en: 'Explore Future' },
    reconnect: { cn: '重新靠近', en: 'Reconnect' }
};

// 区域定义
const REGIONS = {
    forest: { cn: '情绪森林', en: 'Emotion Forest', icon: '🌲' },
    coast: { cn: '回忆海岸', en: 'Memory Coast', icon: '🌊' },
    valley: { cn: '日常山谷', en: 'Daily Valley', icon: '🏡' },
    city: { cn: '未来之城', en: 'Future City', icon: '🏙' },
    garden: { cn: '边界花园', en: 'Boundary Garden', icon: '🌸' }
};

// 问题类型定义
const QUESTION_TYPES = {
    guess: { cn: '猜测模式', en: 'Guess Mode' },
    mirror: { cn: '镜像模式', en: 'Mirror Mode' },
    choice: { cn: '选择模式', en: 'Choice Mode' },
    sync: { cn: '同步模式', en: 'Sync Mode' }
};

// 探索长度定义
const JOURNEY_LENGTH = {
    short: {
        key: 'short',
        cn: '轻量',
        en: 'Light',
        questions: 2,
        duration: '3min',
        durationCn: '约3分钟',
        durationEn: '~3 min',
        icon: '🌙',
        desc: '适合睡前',
        descEn: 'For bedtime'
    },
    normal: {
        key: 'normal',
        cn: '标准',
        en: 'Standard',
        questions: 3,
        duration: '5min',
        durationCn: '约5分钟',
        durationEn: '~5 min',
        icon: '🗺️',
        desc: '适合日常探索',
        descEn: 'For daily exploration'
    },
    deep: {
        key: 'deep',
        cn: '深入',
        en: 'Deep',
        questions: 5,
        duration: '10min',
        durationCn: '约10分钟',
        durationEn: '~10 min',
        icon: '💫',
        desc: '适合约会',
        descEn: 'For a date'
    }
};

// 计算事件触发位置
function getEventTriggerStep(maxQuestions) {
    return Math.ceil(maxQuestions / 2);
}

// 此刻之镜场景映射
const MOMENT_SCENE_MAP = {
    coffee: { region: 'coast', emotion: 'nostalgic', cn: '咖啡', en: 'Coffee' },
    night: { region: 'forest', emotion: 'emotional', cn: '夜晚', en: 'Night' },
    travel: { region: 'city', emotion: 'hopeful', cn: '旅行', en: 'Travel' },
    home: { region: 'valley', emotion: 'safe', cn: '家', en: 'Home' },
    conflict: { region: 'garden', emotion: 'curious', cn: '争执', en: 'Conflict' },
    sunset: { region: 'coast', emotion: 'romantic', cn: '日落', en: 'Sunset' },
    morning: { region: 'valley', emotion: 'fresh', cn: '清晨', en: 'Morning' },
    celebration: { region: 'city', emotion: 'joyful', cn: '庆祝', en: 'Celebration' }
};

// 世界反馈效果
const WORLD_EFFECTS = {
    curious: { message: { cn: '🌊 回忆波纹已开启', en: '🌊 Memory Ripples Unlocked' }, unlock: 'ripple' },
    safe: { message: { cn: '🌲 柔光路径已开启', en: '🌲 Soft Light Path Unlocked' }, unlock: 'path' },
    hopeful: { message: { cn: '🏙 星光街区已开启', en: '🏙 Starlight District Unlocked' }, unlock: 'starlight' },
    nostalgic: { message: { cn: '🌊 时光涟漪已开启', en: '🌊 Time Ripples Unlocked' }, unlock: 'time_ripple' },
    emotional: { message: { cn: '🌲 心灵树洞已开启', en: '🌲 Heart Cave Unlocked' }, unlock: 'cave' },
    romantic: { message: { cn: '🌸 花语小径已开启', en: '🌸 Flower Path Unlocked' }, unlock: 'flower_path' },
    fresh: { message: { cn: '🏡 晨光庭院已开启', en: '🏡 Morning Courtyard Unlocked' }, unlock: 'courtyard' },
    joyful: { message: { cn: '🏙 欢庆广场已开启', en: '🏙 Celebration Square Unlocked' }, unlock: 'square' }
};

// ============================================
// 二、问题矩阵（25组合：5阶段 × 5目标）
// ============================================

const QUESTION_MATRIX = {
    // ========== 暧昧期 ==========
    ambiguous: {
        understand: {
            region: 'forest',
            type: 'guess',
            templates: [
                {
                    question: '最近有没有什么小事让你想分享给我？',
                    hint: '从日常小事开始，感受彼此的存在',
                    emotion: 'curious'
                },
                {
                    question: '你觉得我们之间最自然的相处方式是什么？',
                    hint: '关注当下的感受，不需要定义',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想了解但还没机会问我的？',
                    hint: '勇敢迈出第一步，好奇心是最好的桥梁',
                    emotion: 'curious'
                }
            ]
        },
        rediscover: {
            region: 'coast',
            type: 'mirror',
            templates: [
                {
                    question: '如果用一个词形容我们现在的状态，你会选什么？',
                    hint: '不必急着定义，感受当下的氛围',
                    emotion: 'nostalgic'
                },
                {
                    question: '最近一次让你想起我是什么时候？',
                    hint: '分享那些不经意的瞬间',
                    emotion: 'romantic'
                }
            ]
        },
        express: {
            region: 'valley',
            type: 'sync',
            templates: [
                {
                    question: '你期待我们接下来会怎样发展？',
                    hint: '表达期待不是压力，是邀请',
                    emotion: 'hopeful'
                },
                {
                    question: '有什么是你希望在关系中慢慢建立的？',
                    hint: '从小期待开始，让关系自然生长',
                    emotion: 'hopeful'
                }
            ]
        },
        future: {
            region: 'city',
            type: 'mirror',
            templates: [
                {
                    question: '如果未来我们成为彼此生活的一部分，你最期待什么？',
                    hint: '想象未来是了解彼此的方式',
                    emotion: 'hopeful'
                },
                {
                    question: '你觉得我们会有怎样的故事？',
                    hint: '让想象力自由飞翔',
                    emotion: 'curious'
                }
            ]
        },
        reconnect: {
            region: 'garden',
            type: 'choice',
            templates: [
                {
                    question: '你觉得我们现在最需要什么？',
                    hint: '倾听内心的声音',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想让我知道的？',
                    hint: '真诚的表达会拉近彼此',
                    emotion: 'emotional'
                }
            ]
        }
    },

    // ========== 热恋期 ==========
    love: {
        understand: {
            region: 'forest',
            type: 'mirror',
            templates: [
                {
                    question: '最近有没有什么瞬间让你觉得"就是你了"？',
                    hint: '分享那些心动的时刻',
                    emotion: 'romantic'
                },
                {
                    question: '你最喜欢我们在一起的哪种状态？',
                    hint: '关注那些让彼此舒适的相处模式',
                    emotion: 'joyful'
                },
                {
                    question: '有什么是你想和我一起体验的？',
                    hint: '共同创造回忆是加深了解的方式',
                    emotion: 'curious'
                }
            ]
        },
        rediscover: {
            region: 'coast',
            type: 'guess',
            templates: [
                {
                    question: '如果重新认识彼此，你觉得最吸引你的是什么？',
                    hint: '从新的视角看待熟悉的人',
                    emotion: 'nostalgic'
                },
                {
                    question: '最近有什么让你重新认识我的小事？',
                    hint: '发现彼此新的面貌',
                    emotion: 'curious'
                }
            ]
        },
        express: {
            region: 'valley',
            type: 'sync',
            templates: [
                {
                    question: '你最想让我知道你有多在乎我吗？',
                    hint: '爱的表达不需要理由',
                    emotion: 'romantic'
                },
                {
                    question: '有什么是你想为我们的关系做的？',
                    hint: '行动是最好的表达',
                    emotion: 'joyful'
                }
            ]
        },
        future: {
            region: 'city',
            type: 'mirror',
            templates: [
                {
                    question: '你想象中的我们一年后会是什么样子？',
                    hint: '共同的期待是未来的种子',
                    emotion: 'hopeful'
                },
                {
                    question: '有什么是我们一定要一起完成的？',
                    hint: '写下属于我们的愿望清单',
                    emotion: 'hopeful'
                }
            ]
        },
        reconnect: {
            region: 'garden',
            type: 'choice',
            templates: [
                {
                    question: '你觉得我们之间最珍贵的是什么？',
                    hint: '珍惜当下，守护美好',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想和我一起守护的？',
                    hint: '共同的守护让关系更稳固',
                    emotion: 'emotional'
                }
            ]
        }
    },

    // ========== 长期关系 ==========
    long_term: {
        understand: {
            region: 'forest',
            type: 'guess',
            templates: [
                {
                    question: '这些年来，你觉得我们最大的变化是什么？',
                    hint: '成长是关系的见证',
                    emotion: 'nostalgic'
                },
                {
                    question: '有什么是你最近才了解我的？',
                    hint: '即使相处很久，也总有新发现',
                    emotion: 'curious'
                }
            ]
        },
        rediscover: {
            region: 'coast',
            type: 'guess',
            templates: [
                {
                    question: '如果今天重新认识彼此，你觉得最大的变化是什么？',
                    hint: '从感受开始，而不是评价',
                    emotion: 'curious'
                },
                {
                    question: '最近有什么事让你觉得自己和以前不一样了？',
                    hint: '关注彼此的成长轨迹',
                    emotion: 'nostalgic'
                },
                {
                    question: '有什么是我们曾经喜欢，现在依然喜欢的？',
                    hint: '时光流逝，初心不变',
                    emotion: 'romantic'
                }
            ]
        },
        express: {
            region: 'valley',
            type: 'mirror',
            templates: [
                {
                    question: '你最近有什么想让我知道的心事吗？',
                    hint: '长期关系需要持续的表达',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想感谢我的？',
                    hint: '感恩是维系感情的纽带',
                    emotion: 'emotional'
                }
            ]
        },
        future: {
            region: 'city',
            type: 'sync',
            templates: [
                {
                    question: '接下来的日子，你最期待什么？',
                    hint: '未来是共同创造的',
                    emotion: 'hopeful'
                },
                {
                    question: '有什么是我们还没一起尝试的？',
                    hint: '保持新鲜感是长期关系的秘诀',
                    emotion: 'curious'
                }
            ]
        },
        reconnect: {
            region: 'garden',
            type: 'choice',
            templates: [
                {
                    question: '你觉得我们最近最需要调整的是什么？',
                    hint: '调整是为了更好的相处',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想重新开始的？',
                    hint: '重新开始是勇气的体现',
                    emotion: 'hopeful'
                }
            ]
        }
    },

    // ========== 异地恋 ==========
    long_distance: {
        understand: {
            region: 'forest',
            type: 'mirror',
            templates: [
                {
                    question: '距离让你对我们有什么新的理解？',
                    hint: '距离是考验，也是机会',
                    emotion: 'emotional'
                },
                {
                    question: '有什么是你通过距离才感受到的？',
                    hint: '珍惜那些距离带来的感悟',
                    emotion: 'nostalgic'
                }
            ]
        },
        rediscover: {
            region: 'coast',
            type: 'mirror',
            templates: [
                {
                    question: '最近一次见面，有什么让你印象深刻的？',
                    hint: '回忆是异地恋的养分',
                    emotion: 'romantic'
                },
                {
                    question: '有什么是我们分开后才更珍惜的？',
                    hint: '距离让珍贵更加珍贵',
                    emotion: 'nostalgic'
                }
            ]
        },
        express: {
            region: 'city',
            type: 'mirror',
            templates: [
                {
                    question: '如果未来回看今天，你希望记住什么？',
                    hint: '每一个当下都值得被记住',
                    emotion: 'hopeful'
                },
                {
                    question: '有什么是你想对未来的我们说的？',
                    hint: '跨越时空的对话',
                    emotion: 'hopeful'
                }
            ]
        },
        future: {
            region: 'city',
            type: 'sync',
            templates: [
                {
                    question: '你最期待我们结束异地的那一天吗？',
                    hint: '期待是支撑距离的力量',
                    emotion: 'hopeful'
                },
                {
                    question: '有什么是我们一定要在相聚后做的？',
                    hint: '为未来种下期待的种子',
                    emotion: 'joyful'
                }
            ]
        },
        reconnect: {
            region: 'garden',
            type: 'choice',
            templates: [
                {
                    question: '你觉得我们现在的连接方式需要调整吗？',
                    hint: '找到适合彼此的相处节奏',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想让距离不再成为障碍的？',
                    hint: '用心缩短心的距离',
                    emotion: 'emotional'
                }
            ]
        }
    },

    // ========== 重新靠近 ==========
    reconnect: {
        understand: {
            region: 'forest',
            type: 'guess',
            templates: [
                {
                    question: '这段时间，你对我们有什么新的感受？',
                    hint: '重新开始需要新的理解',
                    emotion: 'curious'
                },
                {
                    question: '有什么是你想重新了解我的？',
                    hint: '带着好奇重新认识',
                    emotion: 'curious'
                }
            ]
        },
        rediscover: {
            region: 'coast',
            type: 'mirror',
            templates: [
                {
                    question: '你觉得我们之间还保留着什么？',
                    hint: '发现那些不变的珍贵',
                    emotion: 'nostalgic'
                },
                {
                    question: '有什么是我们都想找回的？',
                    hint: '共同的回忆是重新靠近的桥梁',
                    emotion: 'emotional'
                }
            ]
        },
        express: {
            region: 'valley',
            type: 'sync',
            templates: [
                {
                    question: '你想让我知道你现在的心情吗？',
                    hint: '真诚是重新靠近的第一步',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想为我们的重新开始做的？',
                    hint: '行动比语言更有力量',
                    emotion: 'hopeful'
                }
            ]
        },
        future: {
            region: 'city',
            type: 'mirror',
            templates: [
                {
                    question: '你希望我们重新建立什么样的关系？',
                    hint: '新的关系需要新的期待',
                    emotion: 'hopeful'
                },
                {
                    question: '有什么是你想和新的我们一起尝试的？',
                    hint: '创造新的可能性',
                    emotion: 'curious'
                }
            ]
        },
        reconnect: {
            region: 'garden',
            type: 'choice',
            templates: [
                {
                    question: '你觉得我们需要什么样的边界？',
                    hint: '边界是尊重的体现',
                    emotion: 'safe'
                },
                {
                    question: '有什么是你想让我们彼此守护的？',
                    hint: '守护让关系更稳固',
                    emotion: 'emotional'
                }
            ]
        }
    }
};

// ============================================
// 三、核心生成函数
// ============================================

/**
 * 生成问题（主入口）
 * @param {Object} journeyState - 旅程状态
 * @param {string} journeyState.stage - 关系阶段
 * @param {string} journeyState.goal - 探索目标
 * @param {string} journeyState.mode - 探索模式 (normal | moment)
 * @param {Object} journeyState.moment - 此刻之镜输入
 * @param {Array} journeyState.history - 历史记录
 * @returns {Object} 生成结果
 */
function generateQuestion(journeyState) {
    const {
        stage = 'ambiguous',
        goal = 'understand',
        mode = 'normal',
        moment = {},
        history = []
    } = journeyState;

    // 1. 根据优先级获取基础问题组
    let questionData = selectQuestionByPriority(stage, goal, history);

    // 2. 此刻之镜增强
    if (mode === 'moment' && moment.scene) {
        questionData = enhanceWithMoment(questionData, moment);
    }

    // 3. 生成解释
    const reason = generateReason(stage, goal, moment, questionData.region);

    return {
        region: questionData.region,
        question: questionData.question,
        type: questionData.type,
        hint: questionData.hint,
        emotion: questionData.emotion,
        reason: reason
    };
}

/**
 * 按优先级选择问题
 */
function selectQuestionByPriority(stage, goal, history) {
    const stageMatrix = QUESTION_MATRIX[stage] || QUESTION_MATRIX.ambiguous;
    const goalData = stageMatrix[goal] || stageMatrix.understand;

    const availableTemplates = avoidRepeat(goalData.templates, history);

    const selectedTemplate = availableTemplates[
        Math.floor(Math.random() * availableTemplates.length)
    ];

    return {
        region: goalData.region,
        type: goalData.type,
        ...selectedTemplate
    };
}

/**
 * 此刻之镜增强
 */
function enhanceWithMoment(questionData, moment) {
    const { scene, text, imageTags = [] } = moment;

    const sceneMap = MOMENT_SCENE_MAP[scene] || MOMENT_SCENE_MAP.night;

    let enhancedQuestion = questionData.question;
    const sceneKeywords = {
        coffee: '在这个咖啡香气里',
        night: '在今晚这个瞬间',
        travel: '在旅途中',
        home: '在这个家的氛围里',
        sunset: '在日落时分',
        morning: '在这个清晨',
        celebration: '在这个庆祝时刻',
        conflict: '在这个当下'
    };

    if (sceneKeywords[scene]) {
        if (!enhancedQuestion.includes(sceneKeywords[scene])) {
            enhancedQuestion = enhancedQuestion.replace(
                /^(如果|最近|有什么|你觉得)/,
                `$1${sceneKeywords[scene]}，`
            );
        }
    }

    let emotion = questionData.emotion;
    if (imageTags.includes('warm')) emotion = 'romantic';
    if (imageTags.includes('quiet')) emotion = 'safe';
    if (imageTags.includes('bright')) emotion = 'joyful';

    return {
        ...questionData,
        question: enhancedQuestion,
        emotion: emotion,
        region: sceneMap.region || questionData.region
    };
}

/**
 * 避免重复（最近5次）
 */
function avoidRepeat(templates, history) {
    if (!history || history.length === 0) return templates;

    const recentQuestions = history
        .slice(0, 5)
        .map(h => h.question);

    const filtered = templates.filter(t =>
        !recentQuestions.includes(t.question)
    );

    return filtered.length > 0 ? filtered : templates;
}

/**
 * 生成解释
 */
function generateReason(stage, goal, moment, region) {
    const stageLabel = STAGES[stage]?.cn || stage;
    const goalLabel = GOALS[goal]?.cn || goal;

    let reason = `${stageLabel} × ${goalLabel}`;

    if (moment && moment.scene) {
        const sceneLabel = MOMENT_SCENE_MAP[moment.scene]?.cn || moment.scene;
        reason += ` × ${sceneLabel}`;
    }

    return reason;
}

/**
 * 生成世界反馈效果
 */
function generateWorldEffect(emotion) {
    const effect = WORLD_EFFECTS[emotion] || WORLD_EFFECTS.curious;
    return {
        message: effect.message,
        unlock: effect.unlock
    };
}

/**
 * 生成发现（双人回答后的洞察）
 */
function generateDiscovery(answerA, answerB) {
    const a = String(answerA || '').toLowerCase();
    const b = String(answerB || '').toLowerCase();

    const commonWords = ['一起', '喜欢', '想', '爱', '希望', '理解', '感受', '分享', '陪伴'];
    const aWords = a.split(/\s+/).filter(w => w.length > 1);
    const bWords = b.split(/\s+/).filter(w => w.length > 1);

    let hasCommon = false;
    commonWords.forEach(word => {
        if (a.includes(word) && b.includes(word)) {
            hasCommon = true;
        }
    });

    const overlap = aWords.filter(w => bWords.includes(w)).length;
    const isSimilar = overlap >= 2 || hasCommon;

    const discoveries = {
        similar: [
            {
                title: '✨ 共鸣',
                desc: '原来你们都在期待更多表达。'
            },
            {
                title: '✨ 共鸣',
                desc: '你们对这件事的感受如此相似。'
            },
            {
                title: '✨ 共鸣',
                desc: '原来你们都有同样的期待。'
            },
            {
                title: '✨ 共鸣',
                desc: '你们的内心想法如此贴近。'
            },
            {
                title: '✨ 共鸣',
                desc: '原来你们都在思考同样的事。'
            }
        ],
        different: [
            {
                title: '🌱 新发现',
                desc: '原来你理解的变化，和对方感受到的不一样。'
            },
            {
                title: '🌱 新发现',
                desc: '你们从不同角度看同一个问题。'
            },
            {
                title: '🌱 新发现',
                desc: '原来对方的感受和你想象的不同。'
            },
            {
                title: '🌱 新发现',
                desc: '你们用不同的方式表达同样的关心。'
            },
            {
                title: '🌱 新发现',
                desc: '原来你们在这件事上有不同的视角。'
            }
        ]
    };

    const pool = isSimilar ? discoveries.similar : discoveries.different;
    const discovery = pool[Math.floor(Math.random() * pool.length)];

    return {
        title: discovery.title,
        desc: discovery.desc,
        type: isSimilar ? 'similar' : 'different'
    };
}

/**
 * 根据发现生成世界变化
 */
function generateWorldChange(discoveryType, region) {
    const changes = {
        similar: [
            { worldEvent: { cn: `${REGIONS[region]?.icon} ${REGIONS[region]?.cn} 发光了`, en: `${REGIONS[region]?.icon} ${REGIONS[region]?.en} glows` }, unlock: 'glow' },
            { worldEvent: { cn: '🌊 回忆海岸泛起涟漪', en: '🌊 Memory Coast ripples' }, unlock: 'ripple' },
            { worldEvent: { cn: '✨ 星空更加璀璨', en: '✨ Stars shine brighter' }, unlock: 'stars' }
        ],
        different: [
            { worldEvent: { cn: '🌸 花园出现新路径', en: '🌸 New path appears in garden' }, unlock: 'new_path' },
            { worldEvent: { cn: '🌲 森林中发现新物种', en: '🌲 New species discovered in forest' }, unlock: 'new_species' },
            { worldEvent: { cn: '🏙 城市边缘扩展', en: '🏙 City expands its borders' }, unlock: 'expand' }
        ],
        event: [
            { worldEvent: { cn: `${REGIONS[region]?.icon} ${REGIONS[region]?.cn} 发生变化`, en: `${REGIONS[region]?.icon} ${REGIONS[region]?.en} has changed` }, unlock: 'event_change' },
            { worldEvent: { cn: '🌍 世界出现新的色彩', en: '🌍 New colors appear in the world' }, unlock: 'new_colors' },
            { worldEvent: { cn: '💫 时空产生涟漪', en: '💫 Ripples in time and space' }, unlock: 'time_ripple' }
        ],
        resonance: [
            { worldEvent: { cn: `${REGIONS[region]?.icon} ${REGIONS[region]?.cn} 发光了`, en: `${REGIONS[region]?.icon} ${REGIONS[region]?.en} glows` }, unlock: 'glow' },
            { worldEvent: { cn: '🌊 回忆海岸泛起涟漪', en: '🌊 Memory Coast ripples' }, unlock: 'ripple' },
            { worldEvent: { cn: '✨ 星空更加璀璨', en: '✨ Stars shine brighter' }, unlock: 'stars' }
        ],
        discovery: [
            { worldEvent: { cn: '🌸 花园出现新路径', en: '🌸 New path appears in garden' }, unlock: 'new_path' },
            { worldEvent: { cn: '🌲 森林中发现新物种', en: '🌲 New species discovered in forest' }, unlock: 'new_species' },
            { worldEvent: { cn: '🏙 城市边缘扩展', en: '🏙 City expands its borders' }, unlock: 'expand' }
        ]
    };

    const pool = changes[discoveryType] || changes.different;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================
// 四、辅助函数
// ============================================

function getRegionInfo(regionKey, lang = 'cn') {
    const region = REGIONS[regionKey];
    if (!region) return null;
    return {
        key: regionKey,
        name: region[lang] || region.cn,
        icon: region.icon
    };
}

function getStageInfo(stageKey, lang = 'cn') {
    const stage = STAGES[stageKey];
    if (!stage) return null;
    return {
        key: stageKey,
        name: stage[lang] || stage.cn
    };
}

function getGoalInfo(goalKey, lang = 'cn') {
    const goal = GOALS[goalKey];
    if (!goal) return null;
    return {
        key: goalKey,
        name: goal[lang] || goal.cn
    };
}

function getQuestionTypeInfo(typeKey, lang = 'cn') {
    const type = QUESTION_TYPES[typeKey];
    if (!type) return null;
    return {
        key: typeKey,
        name: type[lang] || type.cn
    };
}

function mapLegacyStage(legacyStage) {
    const mapping = {
        'new': 'ambiguous',
        'dating': 'love',
        'long-term': 'long_term',
        'long-distance': 'long_distance'
    };
    return mapping[legacyStage] || legacyStage;
}

function mapLegacyGoal(legacyGoal) {
    const mapping = {
        'know': 'understand',
        'icebreak': 'understand',
        'common': 'rediscover',
        'connect': 'express',
        'growth': 'future',
        'future': 'future',
        'rediscover': 'rediscover',
        'express': 'express',
        'reconnect': 'reconnect'
    };
    return mapping[legacyGoal] || legacyGoal;
}

// ============================================
// 五、导出接口
// ============================================

if (typeof window !== 'undefined') {
    window.QuestionEngine = {
        generateQuestion,
        generateWorldEffect,
        generateDiscovery,
        generateWorldChange,
        getRegionInfo,
        getStageInfo,
        getGoalInfo,
        getQuestionTypeInfo,
        mapLegacyStage,
        mapLegacyGoal,
        getEventTriggerStep,
        STAGES,
        GOALS,
        REGIONS,
        QUESTION_TYPES,
        JOURNEY_LENGTH,
        QUESTION_MATRIX
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateQuestion,
        generateWorldEffect,
        generateDiscovery,
        generateWorldChange,
        getRegionInfo,
        getStageInfo,
        getGoalInfo,
        getQuestionTypeInfo,
        mapLegacyStage,
        mapLegacyGoal,
        getEventTriggerStep,
        STAGES,
        GOALS,
        REGIONS,
        QUESTION_TYPES,
        JOURNEY_LENGTH,
        QUESTION_MATRIX
    };
}
