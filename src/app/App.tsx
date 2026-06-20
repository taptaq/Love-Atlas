import { useEffect } from 'react';
import { AuthButton } from '../components/auth/AuthButton';
import { LanguageToggle } from '../components/ui/LanguageToggle';
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
import { useJourneyStore } from '../store';

function renderPage(step: ReturnType<typeof useJourneyStore.getState>['currentStep']) {
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
      return <HomePage />;
  }
}

export function App() {
  useRelationshipSessionSync();
  useSpacePresenceHeartbeat();
  useSpacePresenceMonitor();
  const currentStep = useJourneyStore((state) => state.currentStep);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return (
    <div className="app-shell">
      <StarBackground />
      <LanguageToggle />
      <AuthButton />
      <ErrorBoundary>{renderPage(currentStep)}</ErrorBoundary>
    </div>
  );
}
