import { useEffect } from 'react';
import { AuthButton } from '../components/auth/AuthButton';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { SyncStatusIndicator } from '../components/ui/SyncStatusIndicator';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuthStore } from '../features/auth/useAuthStore';
import { useRelationshipSessionSync } from '../features/session/useRelationshipSessionSync';
import { useSpacePresenceHeartbeat } from '../features/session/useSpacePresenceHeartbeat';
import { useSpacePresenceMonitor } from '../features/session/useSpacePresenceMonitor';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';
import { StarBackground } from '../components/layout/StarBackground';
import { DiscoveryAtlasPage } from '../pages/DiscoveryAtlasPage/DiscoveryAtlasPage';
import { EventPage } from '../pages/EventPage/EventPage';
import { ExplorationHistoryPage } from '../pages/ExplorationHistoryPage/ExplorationHistoryPage';
import { GoalPage } from '../pages/GoalPage/GoalPage';
import { HomePage } from '../pages/HomePage/HomePage';
import { JourneyPage } from '../pages/JourneyPage/JourneyPage';
import { RoutePage } from '../pages/RoutePage/RoutePage';
import { SetupPage } from '../pages/SetupPage/SetupPage';
import { SpaceManagementPage } from '../pages/SpaceManagementPage/SpaceManagementPage';
import { SpaceLibraryPage } from '../pages/SpaceLibraryPage/SpaceLibraryPage';
import { SummaryPage } from '../pages/SummaryPage/SummaryPage';
import { WorldPage } from '../pages/WorldPage/WorldPage';
import { useJourneyStore, useUiStore } from '../store';

function renderPage(step: ReturnType<typeof useJourneyStore.getState>['currentStep'], memberCount: number) {
  switch (step) {
    case 'setup':
      return <SetupPage />;
    case 'goal':
      return <GoalPage />;
    case 'route':
      return <RoutePage />;
    case 'journey':
      return <JourneyPage />;
    case 'event':
      return <EventPage />;
    case 'summary':
      return <SummaryPage />;
    case 'world':
      return <WorldPage />;
    case 'discoveryAtlas':
      return <DiscoveryAtlasPage />;
    case 'explorationHistory':
      return <ExplorationHistoryPage />;
    case 'spaceManagement':
      return <SpaceManagementPage />;
    case 'spaceLibrary':
      return <SpaceLibraryPage />;
    case 'home':
    default:
      return <HomePage memberCount={memberCount} />;
  }
}

export function App() {
  useRelationshipSessionSync();
  useSpacePresenceHeartbeat();
  const memberCount = useSpacePresenceMonitor();
  const currentStep = useJourneyStore((state) => state.currentStep);
  const language = useUiStore((state) => state.language);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const cn = language === 'cn';

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const titles: Record<string, { cn: string; en: string }> = {
      home: { cn: 'Love Atlas · 深度对话启动器', en: 'Love Atlas · Deep Conversation Starter' },
      setup: { cn: '关系阶段 · Love Atlas', en: 'Setup · Love Atlas' },
      goal: { cn: '探索目标 · Love Atlas', en: 'Goal · Love Atlas' },
      route: { cn: '地图路线 · Love Atlas', en: 'Route · Love Atlas' },
      journey: { cn: '探索旅程 · Love Atlas', en: 'Journey · Love Atlas' },
      event: { cn: '镜像时刻 · Love Atlas', en: 'Mirror Event · Love Atlas' },
      summary: { cn: '探索总结 · Love Atlas', en: 'Summary · Love Atlas' },
      world: { cn: '关系世界 · Love Atlas', en: 'World · Love Atlas' },
      discoveryAtlas: { cn: '发现图鉴 · Love Atlas', en: 'Discovery Atlas · Love Atlas' },
      explorationHistory: { cn: '历史探索 · Love Atlas', en: 'Exploration History · Love Atlas' },
      spaceManagement: { cn: '空间管理 · Love Atlas', en: 'Space Management · Love Atlas' },
      spaceLibrary: { cn: '沉淀库 · Love Atlas', en: 'Space Library · Love Atlas' },
      mirrorEngine: { cn: '镜像引擎 · Love Atlas', en: 'Mirror Engine · Love Atlas' },
    };
    const title = titles[currentStep] ?? titles.home;
    document.title = cn ? title.cn : title.en;
  }, [currentStep, cn]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">{cn ? '跳到主要内容' : 'Skip to content'}</a>
      <StarBackground />
      <header className="app-header">
        <LanguageToggle />
        <ThemeToggle />
        <AuthButton />
      </header>
      <SyncStatusIndicator />
      <main id="main-content">
        <ErrorBoundary>{renderPage(currentStep, memberCount)}</ErrorBoundary>
      </main>
    </div>
  );
}
