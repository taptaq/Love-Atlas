/**
 * Love Atlas - 事件引擎 (Event Engine)
 * 基于规则生成，接口设计为未来可替换模型
 */

// ============================================
// 一、常量定义
// ============================================

// 事件类型定义
const EVENT_TYPES = {
    memory: { cn: '回忆浮现', en: 'Memory Surfaces' },
    switch: { cn: '视角交换', en: 'Perspective Switch' },
    mirror: { cn: '镜像时刻', en: 'Mirror Moment' },
    moment: { cn: '此刻冻结', en: 'Moment Freeze' },
    future: { cn: '未来寄语', en: 'Message to Future' },
    silence: { cn: '沉默时刻', en: 'Silence Moment' }
};

// 区域到事件的映射
const REGION_EVENT_MAP = {
    forest: { cn: '情绪森林', en: 'Emotion Forest', event: 'mirror', icon: '🌲' },
    coast: { cn: '回忆海岸', en: 'Memory Coast', event: 'memory', icon: '🌊' },
    valley: { cn: '日常山谷', en: 'Daily Valley', event: 'moment', icon: '🏡' },
    city: { cn: '未来之城', en: 'Future City', event: 'future', icon: '🏙' },
    garden: { cn: '边界花园', en: 'Boundary Garden', event: 'switch', icon: '🌸' }
};

// ============================================
// 二、事件模板
// ============================================

const EVENT_TEMPLATES = {
    memory: {
        icon: '🌊',
        title: { cn: '一段回忆浮现', en: 'A Memory Surfaces' },
        description: { 
            cn: '有些记忆藏在心底，等待被重新发现。', 
            en: 'Some memories lie hidden in the heart, waiting to be rediscovered.' 
        },
        action: {
            cn: '双方回答：第一次觉得靠近是什么时候？',
            en: 'Both answer: When was the first time you felt close?'
        },
        question: {
            cn: '第一次觉得靠近是什么时候？',
            en: 'When was the first time you felt close?'
        },
        type: 'memory'
    },
    switch: {
        icon: '🪞',
        title: { cn: '换个角度', en: 'Perspective Switch' },
        description: { 
            cn: '有时候，理解需要站在对方的位置。', 
            en: 'Sometimes, understanding requires standing in the other\'s shoes.' 
        },
        action: {
            cn: '互相替对方回答刚才的问题',
            en: 'Answer the previous question as if you were the other person'
        },
        question: {
            cn: '如果是 TA，会怎么回答？',
            en: 'What would they say?'
        },
        type: 'switch'
    },
    mirror: {
        icon: '💫',
        title: { cn: '镜像时刻', en: 'Mirror Moment' },
        description: { 
            cn: '在这一刻，你们看到了彼此的倒影。', 
            en: 'In this moment, you see each other\'s reflections.' 
        },
        action: {
            cn: '同时写下此刻对彼此的感受',
            en: 'Write down your feelings for each other simultaneously'
        },
        question: {
            cn: '此刻，你对 TA 的感受是什么？',
            en: 'Right now, what do you feel about them?'
        },
        type: 'mirror'
    },
    moment: {
        icon: '📸',
        title: { cn: '此刻冻结', en: 'Moment Freeze' },
        description: { 
            cn: '时间暂停，让这一刻成为永恒。', 
            en: 'Time pauses, letting this moment become eternal.' 
        },
        action: {
            cn: '上传一张此刻的照片',
            en: 'Upload a photo of this moment'
        },
        question: {
            cn: '这张照片让你想起什么？',
            en: 'What does this photo remind you of?'
        },
        type: 'moment'
    },
    future: {
        icon: '🏙',
        title: { cn: '留下一句话给未来', en: 'Message to Future' },
        description: { 
            cn: '未来的你们，会感谢此刻的自己。', 
            en: 'Future versions of you will thank yourselves for this moment.' 
        },
        action: {
            cn: '共同输入一句话给一年后的彼此',
            en: 'Write a message together to your future selves'
        },
        question: {
            cn: '一年后，你想对彼此说什么？',
            en: 'What do you want to say to each other in a year?'
        },
        type: 'future'
    },
    silence: {
        icon: '🌙',
        title: { cn: '保持安静', en: 'Silence Moment' },
        description: { 
            cn: '在沉默中，听见彼此的心跳。', 
            en: 'In silence, hear each other\'s heartbeat.' 
        },
        action: {
            cn: '保持30秒安静，然后回答',
            en: 'Stay silent for 30 seconds, then answer'
        },
        question: {
            cn: '刚刚在想什么？',
            en: 'What were you thinking about just now?'
        },
        type: 'silence',
        duration: 30
    }
};

// ============================================
// 三、核心生成函数
// ============================================

/**
 * 生成事件（主入口）
 * @param {Object} context - 上下文信息
 * @param {string} context.region - 当前区域
 * @param {string} context.questionType - 问题类型
 * @param {Object} context.answers - 回答记录
 * @param {string} context.mode - 模式 (normal | moment)
 * @returns {Object} 事件数据
 */
function generateEvent(context) {
    const {
        region = 'forest',
        questionType = 'guess',
        answers = {},
        mode = 'normal'
    } = context;

    // 根据区域确定事件类型
    let eventType = REGION_EVENT_MAP[region]?.event || 'mirror';

    // 根据问题类型调整事件
    if (questionType === 'mirror') {
        eventType = 'mirror';
    } else if (questionType === 'sync') {
        eventType = 'future';
    } else if (questionType === 'choice') {
        eventType = 'switch';
    }

    // 获取事件模板
    const template = EVENT_TEMPLATES[eventType];

    // 调试输出
    console.log('[Event Engine]', {
        Region: region,
        QuestionType: questionType,
        EventType: eventType,
        Title: template.title
    });

    return {
        title: template.title,
        description: template.description,
        action: template.action,
        question: template.question,
        type: template.type,
        icon: template.icon,
        duration: template.duration || 0
    };
}

/**
 * 根据情绪确定事件类型
 */
function getEventByEmotion(emotion) {
    const emotionMap = {
        emotional: 'mirror',
        nostalgic: 'memory',
        hopeful: 'future',
        safe: 'moment',
        curious: 'switch',
        romantic: 'mirror',
        joyful: 'moment',
        fresh: 'future'
    };
    
    const eventType = emotionMap[emotion] || 'mirror';
    return EVENT_TEMPLATES[eventType];
}

/**
 * 获取区域事件映射信息
 */
function getRegionEventInfo(regionKey, lang = 'cn') {
    const region = REGION_EVENT_MAP[regionKey];
    if (!region) return null;
    const event = EVENT_TYPES[region.event];
    return {
        key: regionKey,
        name: region[lang] || region.cn,
        icon: region.icon,
        eventType: region.event,
        eventName: event ? (event[lang] || event.cn) : ''
    };
}

/**
 * 获取事件类型信息
 */
function getEventTypeInfo(typeKey, lang = 'cn') {
    const type = EVENT_TYPES[typeKey];
    if (!type) return null;
    return {
        key: typeKey,
        name: type[lang] || type.cn
    };
}

// ============================================
// 四、导出接口
// ============================================

if (typeof window !== 'undefined') {
    window.EventEngine = {
        generateEvent,
        getEventByEmotion,
        getRegionEventInfo,
        getEventTypeInfo,
        EVENT_TYPES,
        REGION_EVENT_MAP,
        EVENT_TEMPLATES
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateEvent,
        getEventByEmotion,
        getRegionEventInfo,
        getEventTypeInfo,
        EVENT_TYPES,
        REGION_EVENT_MAP,
        EVENT_TEMPLATES
    };
}
