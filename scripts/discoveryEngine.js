/**
 * Love Atlas - 发现引擎 (Discovery Engine)
 * 基于规则生成发现内容，接口设计为未来可替换模型
 */

// ============================================
// 一、常量定义
// ============================================

// 发现类型定义
const DISCOVERY_TYPES = {
    event: { cn: '事件', en: 'Event' },
    region: { cn: '区域', en: 'Region' },
    journey: { cn: '旅程', en: 'Journey' }
};

// 事件发现模板：根据事件类型生成
const EVENT_DISCOVERY_TEMPLATES = {
    switch: [
        { icon: '🪞', title: '换个角度', message: '原来你们理解重点并不一样。' },
        { icon: '🪞', title: '换个角度', message: '替对方回答时，才看到不同。' },
        { icon: '🪞', title: '换个角度', message: '以为了解对方，其实只是猜测。' }
    ],
    moment: [
        { icon: '📸', title: '此刻冻结', message: '今天被认真记录下来了。' },
        { icon: '📸', title: '此刻冻结', message: '这一刻值得被记住。' },
        { icon: '📸', title: '此刻冻结', message: '你们共同创造了一个瞬间。' }
    ],
    memory: [
        { icon: '🌊', title: '回忆浮现', message: '过去的点滴开始被重新提起。' },
        { icon: '🌊', title: '回忆浮现', message: '有些事很久没说出口了。' },
        { icon: '🌊', title: '回忆浮现', message: '第一次靠近，现在还记得。' }
    ],
    future: [
        { icon: '🏙', title: '留给未来', message: '你们开始共同想象以后。' },
        { icon: '🏙', title: '留给未来', message: '对未来的想象开始重叠。' },
        { icon: '🏙', title: '留给未来', message: '现在说的话，未来会再提起。' }
    ],
    silence: [
        { icon: '🌙', title: '沉默时刻', message: '安静的30秒里，有很多没说出口。' },
        { icon: '🌙', title: '沉默时刻', message: '不说话的时候，也在靠近。' }
    ],
    mirror: [
        { icon: '💫', title: '镜像时刻', message: '同时写下的话，有微妙的不同。' },
        { icon: '💫', title: '镜像时刻', message: '你们看到了彼此的倒影。' }
    ]
};

// 区域发现模板：根据区域生成，每个区域只触发一次
const REGION_DISCOVERY_TEMPLATES = {
    coast: [
        { icon: '🌊', title: '回忆海岸', message: '过去开始浮现。' },
        { icon: '🌊', title: '回忆海岸', message: '有些记忆藏在这里很久了。' },
        { icon: '🌊', title: '回忆海岸', message: '海的声音让回忆变清晰。' }
    ],
    forest: [
        { icon: '🌲', title: '情绪森林', message: '开始表达平时不会说的话。' },
        { icon: '🌲', title: '情绪森林', message: '深层的情绪被提起来了。' },
        { icon: '🌲', title: '情绪森林', message: '有些感受，很久没说出口。' }
    ],
    city: [
        { icon: '🏙', title: '未来之城', message: '开始讨论未来。' },
        { icon: '🏙', title: '未来之城', message: '想象开始变得具体。' },
        { icon: '🏙', title: '未来之城', message: '你们的未来有了形状。' }
    ],
    valley: [
        { icon: '🏡', title: '日常山谷', message: '生活的节奏让彼此更近。' },
        { icon: '🏡', title: '日常山谷', message: '平凡的日子也是一种靠近。' },
        { icon: '🏡', title: '日常山谷', message: '一起走过的日常是珍贵的。' }
    ],
    garden: [
        { icon: '🌸', title: '边界花园', message: '有些边界可以重新理解。' },
        { icon: '🌸', title: '边界花园', message: '你们之间的界限在变化。' },
        { icon: '🌸', title: '边界花园', message: '边界也是可以一起探索的。' }
    ]
};

// 旅程发现模板：每次旅程结束时生成一条
const JOURNEY_DISCOVERY_TEMPLATES = [
    { icon: '✨', title: '今日靠近', message: '原来彼此理解并不总一致。' },
    { icon: '✨', title: '今日靠近', message: '每一次对话都在更新彼此的印象。' },
    { icon: '✨', title: '今日靠近', message: '今天的你们比昨天更了解对方。' },
    { icon: '✨', title: '今日留下', message: '这一刻值得被记住。' },
    { icon: '✨', title: '今日留下', message: '有些发现，需要时间来消化。' },
    { icon: '✨', title: '今日留下', message: '探索不是为了答案，而是为了看见彼此。' }
];

// ============================================
// 二、核心生成函数
// ============================================

function generateId() {
    return 'd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function nowFormatted() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 生成事件发现
 */
function generateEventDiscovery(eventData) {
    const eventType = eventData?.type || 'switch';
    const templates = EVENT_DISCOVERY_TEMPLATES[eventType] || EVENT_DISCOVERY_TEMPLATES.switch;
    const template = templates[Math.floor(Math.random() * templates.length)];

    return {
        id: generateId(),
        icon: template.icon,
        title: template.title,
        message: template.message,
        category: 'event',
        time: nowFormatted()
    };
}

/**
 * 生成区域发现
 */
function generateRegionDiscovery(region) {
    const templates = REGION_DISCOVERY_TEMPLATES[region] || REGION_DISCOVERY_TEMPLATES.coast;
    const template = templates[Math.floor(Math.random() * templates.length)];

    return {
        id: generateId(),
        icon: template.icon,
        title: template.title,
        message: template.message,
        category: 'region',
        region: region,
        time: nowFormatted()
    };
}

/**
 * 生成旅程发现
 */
function generateJourneyDiscovery(journey) {
    const template = JOURNEY_DISCOVERY_TEMPLATES[Math.floor(Math.random() * JOURNEY_DISCOVERY_TEMPLATES.length)];

    return {
        id: generateId(),
        icon: template.icon,
        title: template.title,
        message: template.message,
        category: 'journey',
        time: nowFormatted()
    };
}

/**
 * 统一入口：生成发现
 * @param {Object} context
 * @param {string} context.type - 'event' | 'region' | 'journey'
 * @param {Object} context.eventData - 事件数据（仅 event 类型）
 * @param {string} context.region - 区域名称（仅 region 类型）
 * @param {Object} context.journey - 旅程数据（仅 journey 类型）
 * @returns {Object|null} - 发现对象，或 null（如果重复等情况）
 */
function generateDiscovery(context) {
    if (!context || !context.type) {
        return null;
    }

    switch (context.type) {
        case 'event':
            return generateEventDiscovery(context.eventData);
        case 'region':
            return generateRegionDiscovery(context.region);
        case 'journey':
            return generateJourneyDiscovery(context.journey);
        default:
            return null;
    }
}

// ============================================
// 三、辅助函数
// ============================================

/**
 * 检查区域是否已产生过发现
 */
function hasRegionDiscovery(discoveries, region) {
    if (!discoveries || !Array.isArray(discoveries)) {
        return false;
    }
    return discoveries.some(d => d.category === 'region' && d.region === region);
}

/**
 * 限制发现数量（最多20条，超出删除最早）
 */
function trimDiscoveries(discoveries, maxCount = 20) {
    if (!discoveries || !Array.isArray(discoveries)) {
        return [];
    }
    if (discoveries.length <= maxCount) {
        return discoveries;
    }
    // 按时间排序，删除最早的
    return discoveries.slice(-maxCount);
}

/**
 * 从旧数据迁移：如果只有 unlockCount，创建一个默认发现
 */
function migrateFromOldData(oldData) {
    if (!oldData) {
        return [];
    }

    // 如果已经是 discoveries 数组，直接使用
    if (Array.isArray(oldData.discoveries) && oldData.discoveries.length > 0) {
        return oldData.discoveries;
    }

    // 如果有旧的 unlockCount，创建一条纪念性发现
    if (oldData.unlockCount && typeof oldData.unlockCount === 'number' && oldData.unlockCount > 0) {
        return [{
            id: generateId(),
            icon: '📖',
            title: '过去的探索',
            message: `你们曾一起解锁过 ${oldData.unlockCount} 个内容。这些都是靠近的痕迹。`,
            category: 'journey',
            time: nowFormatted()
        }];
    }

    return [];
}

// ============================================
// 四、导出接口
// ============================================

if (typeof window !== 'undefined') {
    window.DiscoveryEngine = {
        generateDiscovery,
        generateEventDiscovery,
        generateRegionDiscovery,
        generateJourneyDiscovery,
        hasRegionDiscovery,
        trimDiscoveries,
        migrateFromOldData,
        DISCOVERY_TYPES,
        EVENT_DISCOVERY_TEMPLATES,
        REGION_DISCOVERY_TEMPLATES,
        JOURNEY_DISCOVERY_TEMPLATES
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateDiscovery,
        generateEventDiscovery,
        generateRegionDiscovery,
        generateJourneyDiscovery,
        hasRegionDiscovery,
        trimDiscoveries,
        migrateFromOldData,
        DISCOVERY_TYPES,
        EVENT_DISCOVERY_TEMPLATES,
        REGION_DISCOVERY_TEMPLATES,
        JOURNEY_DISCOVERY_TEMPLATES
    };
}
