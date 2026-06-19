import { useState } from 'react';
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { createPersistentExploration, createPersistentSpace, createTemporarySpace, joinRelationshipSpace, loadExplorationSharedState, listSpaceExplorations, unbindPersistentSpace, upgradeTemporarySpace } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { selectRelationshipSharedState } from '../../features/session/useRelationshipSessionSync';
import { t } from '../../i18n';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import type { ExplorationSession, SpaceApiResult } from '../../types/space';

export function HomePage() {
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const resetJourney = useJourneyStore((state) => state.resetJourney);
  const hydrateSharedState = useJourneyStore((state) => state.hydrateSharedState);
  const latest = useDiscoveryStore((state) => state.latest);
  const state = useDiscoveryStore((store) => store.state);
  const session = useSessionStore((store) => store.session);
  const setSession = useSessionStore((store) => store.setSession);
  const setSessionConnecting = useSessionStore((store) => store.setConnecting);
  const setSessionError = useSessionStore((store) => store.setError);
  const space = useSpaceStore((store) => store.space);
  const spaceStatus = useSpaceStore((store) => store.status);
  const spaceError = useSpaceStore((store) => store.error);
  const spaceRole = useSpaceStore((store) => store.role);
  const setSpace = useSpaceStore((store) => store.setSpace);
  const setSpaceConnecting = useSpaceStore((store) => store.setConnecting);
  const setSpaceError = useSpaceStore((store) => store.setError);
  const clearSpace = useSpaceStore((store) => store.clearSpace);
  const latestCopy = latest ? getDiscoveryCopy(latest, language) : null;
  const authUser = useAuthStore((store) => store.user);
  const authStatus = useAuthStore((store) => store.status);
  const authError = useAuthStore((store) => store.error);
  const signInWithEmail = useAuthStore((store) => store.signInWithEmail);
  const signOut = useAuthStore((store) => store.signOut);
  const [joinCode, setJoinCode] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [explorations, setExplorations] = useState<ExplorationSession[]>([]);
  const hasSpace = Boolean(space && session);
  const isTemporarySpace = space?.type === 'temporary';
  const isPersistentSpace = space?.type === 'persistent';

  const enterSpace = (result: SpaceApiResult) => {
    setSpace(result.space, result.exploration, result.role);
    setSession(result.session, result.role === 'owner' ? 'host' : 'partner');
    if (result.space.type === 'persistent') {
      void refreshExplorations(result.space.id);
    } else {
      setExplorations([]);
    }
  };

  const refreshExplorations = async (spaceId: string) => {
    try {
      const result = await listSpaceExplorations(spaceId);
      setExplorations(result.explorations);
      if (result.explorations[0]) {
        useJourneyStore.getState().setSelectedExplorationId(result.explorations[0].id);
      }
    } catch {
      setExplorations([]);
    }
  };

  const handleOpenHistory = () => {
    if (!space || space.type !== 'persistent') return;
    if (explorations[0]) {
      useJourneyStore.getState().setSelectedExplorationId(explorations[0].id);
    }
    goToStep('explorationHistory');
  };

  const handleCreateTemporarySpace = async () => {
    try {
      resetJourney();
      goToStep('home');
      setSpaceConnecting();
      setSessionConnecting();
      const result = await createTemporarySpace(selectRelationshipSharedState(useJourneyStore.getState()));
      enterSpace(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create temporary space';
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleCreatePersistentSpace = async () => {
    if (!authUser) {
      setSpaceError(language === 'cn' ? '请先登录后再创建专属关系空间' : 'Please sign in before creating a private relationship space');
      return;
    }
    try {
      resetJourney();
      goToStep('home');
      setSpaceConnecting();
      setSessionConnecting();
      const result = await createPersistentSpace(selectRelationshipSharedState(useJourneyStore.getState()), authUser.id);
      enterSpace(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create persistent space';
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleJoinSpace = async () => {
    if (!joinCode.trim()) return;
    try {
      setSpaceConnecting();
      setSessionConnecting();
      const result = await joinRelationshipSpace(joinCode, authUser?.id);
      const explorationState = await loadExplorationSharedState(result.exploration.id);
      if (explorationState.sharedState) hydrateSharedState(explorationState.sharedState);
      enterSpace(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join space';
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleStartExploration = async () => {
    if (!space) return;
    if (space.type === 'temporary') {
      goToStep('setup');
      return;
    }
    if (!authUser) {
      setSpaceError(language === 'cn' ? '请先登录后再开启专属空间探索' : 'Please sign in before starting a private exploration');
      return;
    }
    try {
      resetJourney();
      setSpaceConnecting();
      setSessionConnecting();
      const result = await createPersistentExploration(space.id, selectRelationshipSharedState(useJourneyStore.getState()), authUser.id);
      enterSpace(result);
      goToStep('setup');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create exploration';
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleUpgradeTemporarySpace = async () => {
    if (!space || space.type !== 'temporary') return;
    if (!authUser) {
      setSpaceError(language === 'cn' ? '请先登录后再升级为专属关系空间' : 'Please sign in before upgrading to a private relationship space');
      return;
    }
    try {
      setSpaceConnecting();
      setSessionConnecting();
      const result = await upgradeTemporarySpace(space.id, authUser.id);
      enterSpace(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upgrade space';
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleUnbindSpace = async () => {
    if (!space || !authUser) return;
    try {
      setSpaceConnecting();
      const result = await unbindPersistentSpace(space.id, authUser.id);
      if (result.space.status === 'unbound') {
        clearSpace();
        setSessionConnecting();
        useSessionStore.getState().clearSession();
        resetJourney();
        goToStep('home');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to unbind space';
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleSignIn = async () => {
    if (!authEmail.trim()) return;
    await signInWithEmail(authEmail.trim());
    setAuthMessage(language === 'cn' ? '登录链接已发送，请检查邮箱。' : 'Magic link sent. Please check your inbox.');
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthMessage('');
  };
  return (
    <main className="page home-page space-home-page">
      <section className="space-hero">
        <span className="step-pill">Relationship OS</span>
        <h1>{language === 'cn' ? 'Love Altas' : 'Love Altas'}</h1>
        <p>{language === 'cn' ? '一起探索关系里的心动、差异与默契，把每一次互动沉淀成属于你们的地图。' : 'Explore the sparks, differences, and quiet understanding that shape your shared relationship map.'}</p>
      </section>

      <section className="auth-panel">
        {authUser ? (
          <>
            <span>{language === 'cn' ? '已登录' : 'Signed in'}</span>
            <strong>{authUser.email ?? authUser.id}</strong>
            <button type="button" onClick={handleSignOut} disabled={authStatus === 'loading'}>{language === 'cn' ? '退出登录' : 'Sign out'}</button>
          </>
        ) : (
          <>
            <span>{language === 'cn' ? '登录后可创建专属关系空间' : 'Sign in to create a private relationship space'}</span>
            <div className="auth-row">
              <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder={language === 'cn' ? '输入邮箱接收登录链接' : 'Email for magic link'} />
              <button type="button" onClick={handleSignIn} disabled={authStatus === 'loading'}>{language === 'cn' ? '发送登录链接' : 'Send link'}</button>
            </div>
          </>
        )}
        {(authMessage || authError) && <small className={authError ? 'session-error' : ''}>{authError || authMessage}</small>}
      </section>

      <section className={hasSpace ? 'space-entry-layout' : 'space-entry-layout space-entry-layout-single'}>
        <article className="space-primary-card">
          <span className="card-icon">💞</span>
          <span className="eyebrow">{language === 'cn' ? '空间入口' : 'Space Entry'}</span>
          <h2>
            {space
              ? isTemporarySpace
                ? language === 'cn' ? '临时探索空间已开启' : 'Temporary Space is Open'
                : language === 'cn' ? '专属关系空间已开启' : 'Private Relationship Space is Open'
              : language === 'cn' ? '选择一种关系空间' : 'Choose a Relationship Space'}
          </h2>
          <p>
            {space
              ? isTemporarySpace
                ? language === 'cn' ? '这是一次性的轻量探索空间，适合初识、相亲或一次默契测试。' : 'This is a lightweight one-time space for early connection, dating, or a quick compatibility check.'
                : language === 'cn' ? '这是只属于你们的长期关系空间，会持续沉淀关系地图、发现和总结。' : 'This is your long-term relationship space for maps, discoveries, and summaries.'
              : language === 'cn' ? '你可以创建临时空间快速探索，也可以创建专属关系空间进行长期沉淀。' : 'Create a temporary space for a quick exploration, or a private space for long-term growth.'}
          </p>

          {space && session ? (
            <div className="space-session-panel">
              <span>{language === 'cn' ? '当前空间 ID' : 'Current Space ID'}</span>
              <strong>{space.invite_code}</strong>
              <small>{spaceRole === 'owner' ? (language === 'cn' ? '你是空间创建者' : 'You are the space owner') : (language === 'cn' ? '你已加入对方空间' : 'You joined this space')}</small>
              <button className="primary-btn" type="button" onClick={handleStartExploration}>
                {isTemporarySpace ? (language === 'cn' ? '开启本次探索' : 'Start This Exploration') : (language === 'cn' ? '开启新的探索' : 'Start a New Exploration')}
              </button>
              {isTemporarySpace && (
                <button className="secondary-btn" type="button" onClick={handleCreateTemporarySpace} disabled={spaceStatus === 'connecting'}>
                  {language === 'cn' ? '重新创建临时空间' : 'Create Another Temporary Space'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-entry-actions">
              <button className="primary-btn" type="button" onClick={handleCreateTemporarySpace} disabled={spaceStatus === 'connecting'}>
                {language === 'cn' ? '创建临时探索空间' : 'Create Temporary Space'}
              </button>
              <button className="secondary-btn" type="button" onClick={handleCreatePersistentSpace} disabled={spaceStatus === 'connecting'}>
                {language === 'cn' ? '创建专属关系空间' : 'Create Private Relationship Space'}
              </button>
              <div className="session-join-row">
                <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder={language === 'cn' ? '输入对方空间 ID' : 'Enter partner space ID'} />
                <button type="button" onClick={handleJoinSpace} disabled={spaceStatus === 'connecting'}>{language === 'cn' ? '加入空间' : 'Join Space'}</button>
              </div>
            </div>
          )}

          {spaceStatus === 'connecting' && <small>{language === 'cn' ? '正在连接关系空间…' : 'Connecting relationship space…'}</small>}
          {spaceError && <small className="session-error">{spaceError}</small>}
        </article>

        {hasSpace && isTemporarySpace && (
          <aside className="space-secondary-card">
            <span className="eyebrow">{language === 'cn' ? '临时空间' : 'Temporary Space'}</span>
            <p>{language === 'cn' ? '临时空间只保留一次探索所需的轻量功能，不展示长期地图、历史发现和累计统计。' : 'Temporary spaces keep only the lightweight one-time flow, without long-term maps, history, or stats.'}</p>
            <button type="button" onClick={handleStartExploration}>{language === 'cn' ? '开启本次探索' : 'Start This Exploration'}</button>
            <button type="button" onClick={() => goToStep('summary')}>{language === 'cn' ? '查看本次总结' : 'View This Summary'}</button>
            <button type="button" onClick={handleUpgradeTemporarySpace}>{language === 'cn' ? '升级为专属空间' : 'Upgrade to Private Space'}</button>
          </aside>
        )}

        {hasSpace && isPersistentSpace && (
          <aside className="space-secondary-card">
            <span className="eyebrow">{language === 'cn' ? '专属空间内会发生什么' : 'Inside Your Private Space'}</span>
            <div className="space-flow-list">
              <span>Setup</span>
              <span>Goal</span>
              <span>Route</span>
              <span>AB</span>
              <span>Mirror</span>
              <span>Summary</span>
            </div>
            <button type="button" onClick={handleStartExploration}>{language === 'cn' ? '开启新的探索' : 'Start a New Exploration'}</button>
            <button type="button" onClick={() => goToStep('world')}>{t(language, 'worldTitle')}</button>
            <button type="button" onClick={() => goToStep('discoveryAtlas')}>
              {latest ? `${t(language, 'latestDiscovery')} · ${latestCopy?.title}` : t(language, 'emptyDiscovery')}
            </button>
            <button type="button" onClick={() => goToStep('spaceManagement')}>{language === 'cn' ? '管理空间' : 'Manage Space'}</button>
            <button type="button" onClick={() => goToStep('spaceLibrary')}>{language === 'cn' ? '长期沉淀' : 'Long-term Library'}</button>
            <button type="button" onClick={handleOpenHistory}>
              {language === 'cn' ? `历史探索 ${explorations.length} 次` : `${explorations.length} Past Explorations`}
            </button>
            <button type="button" onClick={handleUnbindSpace}>{language === 'cn' ? '解绑专属空间' : 'Unbind Private Space'}</button>
          </aside>
        )}
      </section>

      {hasSpace && isPersistentSpace && (
        <footer className="home-stats">
          {t(language, 'completed')} <strong>{explorations.length}</strong> {t(language, 'explorations')} · {t(language, 'discovered')} <strong>{state.unlocked.length}</strong> {t(language, 'items')}
        </footer>
      )}
    </main>
  );
}
