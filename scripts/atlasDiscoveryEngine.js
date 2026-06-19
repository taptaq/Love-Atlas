/**
 * Love Atlas - Atlas Discovery Engine（条件解锁引擎）
 * 遍历 DISCOVERY_POOL，根据上下文（journey/event/region/history）
 * 检查每个发现的 condition，自动解锁并去重。
 */

const ATLAS_STORAGE_KEY = 'loveAtlasDiscoveriesV2';
const ATLAS_STATS_KEY = 'loveAtlasStats';

// ============ 数据加载 ============
function loadPool() {
    if (typeof window !== 'undefined' && window.AtlasData && Array.isArray(window.AtlasData.DISCOVERY_POOL)) {
        return window.AtlasData.DISCOVERY_POOL;
    }
    try {
        // 兼容 Node 或手动场景
        if (typeof DISCOVERY_POOL !== 'undefined') return DISCOVERY_POOL;
    } catch (e) {}
    return [];
}

function totalCount() {
    const pool = loadPool();
    return pool.length;
}

// ============ 持久化 ============
function loadAtlasState() {
    try {
        const raw = localStorage.getItem(ATLAS_STORAGE_KEY);
        if (!raw) return { unlocked: [] };
        const parsed = JSON.parse(raw);
        if (!parsed.unlocked) parsed.unlocked = [];
        return parsed;
    } catch (e) {
        return { unlocked: [] };
    }
}

function saveAtlasState(state) {
    try {
        localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
}

function loadStats() {
    try {
        const raw = localStorage.getItem(ATLAS_STATS_KEY);
        if (!raw) return emptyStats();
        const parsed = JSON.parse(raw);
        return Object.assign(emptyStats(), parsed);
    } catch (e) {
        return emptyStats();
    }
}

function emptyStats() {
    return {
        completeCount: 0,
        regionCounts: { forest: 0, coast: 0, valley: 0, city: 0, garden: 0 },
        eventCounts: {},
        momentUpload: false,
        lastExploreTime: null,
        longestAnswer: 0,
        regionVisited: [],
        eventTypeVisited: []
    };
}

function saveStats(stats) {
    try {
        localStorage.setItem(ATLAS_STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
}

// ============ 条件检查 ============
function checkCondition(discovery, context) {
    const cond = discovery.condition || {};
    const { event: ev, region, journey, stats, answers, guessMatched } = context;

    // 事件类
    if (cond.event) {
        if (!ev || ev !== cond.event) return false;
        if (cond.count) {
            const evCount = (stats && stats.eventCounts && stats.eventCounts[cond.event]) || 0;
            if ((evCount + 1) < cond.count) return false;
        }
    }

    // 区域类
    if (cond.region) {
        if (!region || region !== cond.region) return false;
        if (cond.count) {
            const rgCount = (stats && stats.regionCounts && stats.regionCounts[cond.region]) || 0;
            // 本次进入算一次，所以需要 count-1
            if ((rgCount + 1) < cond.count) return false;
        }
    }

    // 旅程长度
    if (cond.journeyLength !== undefined) {
        if (!journey || journey.length !== cond.journeyLength) return false;
    }

    // 猜测匹配
    if (cond.guessMatched !== undefined) {
        if (guessMatched === undefined) return false;
        if (guessMatched !== cond.guessMatched) return false;
    }

    // 回答长度
    if (cond.answersLong) {
        const total = (answers.a || '').length + (answers.b || '').length;
        if (total < 80) return false;
    }

    // 双方都有回答
    if (cond.answersBoth) {
        if (!answers || !answers.a || !answers.b) return false;
    }

    // 首次完成
    if (cond.firstComplete) {
        if (!stats || stats.completeCount !== 0) return false;
    }

    // 完成次数
    if (cond.completeCount) {
        if (!stats || stats.completeCount + 1 !== cond.completeCount) return false;
    }

    // 多个区域
    if (cond.multiRegion) {
        if (!stats || !stats.regionVisited) return false;
        const uniq = new Set(stats.regionVisited.concat([region]).filter(Boolean));
        if (uniq.size < 3) return false;
    }

    // 全部区域
    if (cond.allRegions) {
        if (!stats || !stats.regionVisited) return false;
        const uniq = new Set(stats.regionVisited.concat([region]).filter(Boolean));
        if (uniq.size < 5) return false;
    }

    // 本次旅程有事件
    if (cond.hasEvent) {
        if (!journey || !journey.hasEvent) return false;
    }

    // 事件累计数
    if (cond.eventCount) {
        const total = Object.values(stats?.eventCounts || {}).reduce((a, b) => a + b, 0);
        if ((total + (journey?.hasEvent ? 1 : 0)) < cond.eventCount) return false;
    }

    // 最近连续探索
    if (cond.recentExplore) {
        if (!stats || !stats.lastExploreTime) return false;
        const diff = Date.now() - stats.lastExploreTime;
        if (diff > 1000 * 60 * 60 * 24 * 3) return false; // 3天内
    }

    // 特殊类
    if (cond.firstMomentUpload) {
        if (!journey || !journey.firstMomentUpload) return false;
    }
    if (cond.mirrorCount) {
        const m = (stats?.eventCounts?.mirror) || 0;
        if ((m + (ev === 'mirror' ? 1 : 0)) < cond.mirrorCount) return false;
    }
    if (cond.coastCount) {
        const c = (stats?.regionCounts?.coast) || 0;
        if ((c + (region === 'coast' ? 1 : 0)) < cond.coastCount) return false;
    }
    if (cond.nightExplore) {
        const hour = new Date().getHours();
        if (!(hour >= 22 || hour <= 4)) return false;
    }
    if (cond.deepJourney) {
        if (!journey || journey.length !== 5) return false;
    }
    if (cond.longestAnswer) {
        const total = (answers.a || '').length + (answers.b || '').length;
        if (total < 200) return false;
    }
    if (cond.forestCount) {
        const f = (stats?.regionCounts?.forest) || 0;
        if ((f + (region === 'forest' ? 1 : 0)) < cond.forestCount) return false;
    }
    if (cond.fullCircle) {
        // 检查是否五种类型事件都至少一次
        const needed = ['mirror', 'switch', 'moment', 'memory', 'future'];
        const ev = stats?.eventTypeVisited || [];
        const uniq = new Set(ev);
        for (const need of needed) if (!uniq.has(need)) return false;
    }

    return true;
}

// ============ 核心解锁 ============
function unlockDiscovery(context) {
    const pool = loadPool();
    const state = loadAtlasState();
    const stats = loadStats();

    const existingIds = new Set(state.unlocked.map(u => u.id));
    const newlyUnlocked = [];

    // 把 stats 和 answers 等注入上下文
    const ctx = Object.assign({}, context, { stats });

    pool.forEach((item) => {
        if (existingIds.has(item.id)) return;
        try {
            if (checkCondition(item, ctx)) {
                newlyUnlocked.push(item);
                state.unlocked.push({
                    id: item.id,
                    unlockTime: Date.now()
                });
            }
        } catch (e) {}
    });

    saveAtlasState(state);

    return {
        newItems: newlyUnlocked,
        total: pool.length,
        progress: state.unlocked.length,
        state
    };
}

// ============ 辅助：更新统计 ============
function incrementStats(updater) {
    const stats = loadStats();
    const updated = updater(stats) || stats;
    saveStats(updated);
    return updated;
}

// ============ 辅助：获取最近发现 ============
function getLatestDiscovery() {
    const state = loadAtlasState();
    if (!state.unlocked || state.unlocked.length === 0) return null;
    const sorted = [...state.unlocked].sort((a, b) => b.unlockTime - a.unlockTime);
    const latest = sorted[0];
    const pool = loadPool();
    const item = pool.find(p => p.id === latest.id);
    if (!item) return null;
    return {
        icon: item.icon,
        title: item.title,
        message: item.message,
        category: item.category,
        time: latest.unlockTime
    };
}

// ============ 辅助：获取本次新解锁（用于 Summary） ============
function getDiscoveriesByUnlockTime(unlockTime) {
    if (!unlockTime) return [];
    const state = loadAtlasState();
    const pool = loadPool();
    const threshold = unlockTime - 60 * 60 * 1000; // 最近一小时内

    return state.unlocked
        .filter(u => u.unlockTime >= threshold)
        .map(u => {
            const item = pool.find(p => p.id === u.id);
            return item ? {
                id: item.id,
                icon: item.icon,
                title: item.title,
                message: item.message,
                category: item.category
            } : null;
        })
        .filter(Boolean);
}

// ============ 导出 ============
if (typeof window !== 'undefined') {
    window.AtlasDiscoveryEngine = {
        unlockDiscovery,
        loadAtlasState,
        saveAtlasState,
        loadStats,
        saveStats,
        incrementStats,
        getLatestDiscovery,
        getDiscoveriesByUnlockTime,
        totalCount,
        loadPool,
        ATLAS_STORAGE_KEY,
        ATLAS_STATS_KEY
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        unlockDiscovery,
        loadAtlasState,
        saveAtlasState,
        loadStats,
        saveStats,
        incrementStats,
        getLatestDiscovery,
        getDiscoveriesByUnlockTime,
        totalCount,
        loadPool
    };
}
