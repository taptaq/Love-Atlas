import { useEffect, useState } from 'react';
import { useUiStore } from '../../store';
import { useJourneyStore } from '../../store';
import { loadStats } from '../../services/atlasDiscoveryEngine';
import {
  fetchWeeklyTheme,
  getBlindBoxStatus,
  getCachedWeeklyTheme,
  markBlindBoxOpened,
  markBlindBoxDismissed,
  type WeeklyTheme,
} from '../../services/weeklyBlindBoxService';

export function WeeklyBlindBox() {
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';
  const { weekKey, isOpened, isDismissed } = getBlindBoxStatus();
  const [theme, setTheme] = useState<WeeklyTheme | null>(() => getCachedWeeklyTheme());
  const [loading, setLoading] = useState(!getCachedWeeklyTheme());
  const [opened, setOpened] = useState(isOpened);
  const [hidden, setHidden] = useState(isDismissed);

  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const journeyHistory = useJourneyStore((state) => state.journeyHistory);
  const worldState = useJourneyStore((state) => state.worldState);

  useEffect(() => {
    if (hidden) return;
    // 已有缓存主题则不重复请求
    if (theme && theme.weekKey === weekKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const stats = loadStats();
    const lastExploreTime = stats.lastExploreTime ?? 0;
    const lastExploreDays = lastExploreTime > 0
      ? Math.floor((Date.now() - lastExploreTime) / (24 * 60 * 60 * 1000))
      : -1;

    fetchWeeklyTheme({
      stage: relationshipStage,
      history: journeyHistory.map((item) => item.question.question),
      worldProgress: worldState.regionProgress,
      lastExploreDays,
    }).then((result) => {
      if (!cancelled) {
        setTheme(result);
        setLoading(false);
      }
    }).catch(() => {
      // fetchWeeklyTheme 内部已有 fallback 逻辑，正常不会走到这里
      // 但若网络完全不可用，仍需结束 loading 并显示 fallback 主题
      if (!cancelled) {
        const fallback = getCachedWeeklyTheme() ?? {
          id: `blind-box-${weekKey}`,
          weekKey,
          icon: '🎁',
          title: { cn: '本周主题盲盒', en: 'This Week\'s Blind Box' },
          description: { cn: '一份为你准备的探索主题，点开看看。', en: 'A curated exploration theme is ready for you.' },
          goal: 'deep' as const,
          stage: 'long-term' as const,
          momentText: { cn: '此刻我们在一起，准备开始一次新的探索。', en: 'We are together now, ready to begin a new exploration.' },
          accent: 'mist' as const,
          generatedBy: 'fallback' as const,
        };
        setTheme(fallback);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [weekKey, hidden, theme, relationshipStage, journeyHistory, worldState.regionProgress]);

  if (hidden) return null;

  const handleOpen = () => {
    setOpened(true);
    markBlindBoxOpened(weekKey);
  };

  const handleDismiss = () => {
    setHidden(true);
    markBlindBoxDismissed(weekKey);
  };

  // 加载中状态
  if (loading || !theme) {
    return (
      <section className="blind-box-section" aria-label={cn ? '每周主题盲盒' : 'Weekly Theme Blind Box'}>
        <div className="blind-box-card blind-box-loading" aria-live="polite">
          <span className="blind-box-icon blind-box-icon-spin" aria-hidden="true">🎁</span>
          <span className="blind-box-eyebrow">{cn ? '本周主题盲盒' : 'This Week’s Blind Box'}</span>
          <h3 className="blind-box-title">{cn ? '正在为你准备本周主题…' : 'Preparing this week’s theme…'}</h3>
          <p className="blind-box-hint">{cn ? 'AI 正在根据你们的关系状态生成定制主题' : 'AI is crafting a theme based on your relationship'}</p>
        </div>
      </section>
    );
  }

  const accentClass = `blind-box-accent-${theme.accent}`;

  if (!opened) {
    return (
      <section className="blind-box-section" aria-label={cn ? '每周主题盲盒' : 'Weekly Theme Blind Box'}>
        <button
          type="button"
          className={`blind-box-card blind-box-closed ${accentClass}`}
          onClick={handleOpen}
          aria-label={cn ? '点击开启本周主题盲盒' : 'Tap to open this week’s theme blind box'}
        >
          <span className="blind-box-icon" aria-hidden="true">{theme.icon}</span>
          <span className="blind-box-eyebrow">{cn ? '本周主题盲盒' : 'This Week’s Blind Box'}</span>
          <h3 className="blind-box-title">{cn ? '点开看看本周推荐聊什么' : 'Tap to see what to talk about this week'}</h3>
          <p className="blind-box-hint">{cn ? '每周一更新 · AI 定制探索主题' : 'Updated every Monday · AI-curated theme'}</p>
        </button>
      </section>
    );
  }

  return (
    <section className="blind-box-section" aria-label={cn ? '每周主题盲盒' : 'Weekly Theme Blind Box'}>
      <article className={`blind-box-card blind-box-opened ${accentClass}`}>
        <header className="blind-box-header">
          <span className="blind-box-icon" aria-hidden="true">{theme.icon}</span>
          <div>
            <span className="blind-box-eyebrow">{cn ? '本周盲盒主题 · 仅供参考' : 'This Week’s Blind Box · for reference'}</span>
            <h3 className="blind-box-title">{theme.title[language]}</h3>
          </div>
          <button
            type="button"
            className="blind-box-close"
            onClick={handleDismiss}
            aria-label={cn ? '收起盲盒' : 'Dismiss'}
          >
            ×
          </button>
        </header>
        <p className="blind-box-desc">{theme.description[language]}</p>
        {theme.generatedBy === 'ai' && (
          <small className="blind-box-source">{cn ? '✨ 由 AI 根据你们的关系状态生成' : '✨ Crafted by AI based on your relationship'}</small>
        )}
      </article>
    </section>
  );
}
