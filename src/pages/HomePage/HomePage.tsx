import { useEffect, useState } from 'react';
import { requestAuthPopover } from '../../components/auth/AuthButton';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { createPersistentExploration, createPersistentSpace, createTemporarySpace, joinRelationshipSpace, leaveSpace, loadExplorationSharedState, listSpaceExplorations, unbindPersistentSpace, upgradeTemporarySpace } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { selectRelationshipSharedState } from '../../features/session/useRelationshipSessionSync';
import { t } from '../../i18n';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import type { ExplorationSession, SpaceApiResult } from '../../types/space';

export function HomePage({ memberCount }: { memberCount: number }) {
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const resetJourney = useJourneyStore((state) => state.resetJourney);
  const hydrateSharedState = useJourneyStore((state) => state.hydrateSharedState);
  const summaryResonance = useJourneyStore((state) => state.summary.resonance);
  const journeyHistoryLength = useJourneyStore((state) => state.journeyHistory.length);
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
  const [joinCode, setJoinCode] = useState('');
  const [explorations, setExplorations] = useState<ExplorationSession[]>([]);
  const [explorationsLoading, setExplorationsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [summaryNotice, setSummaryNotice] = useState('');
  const [spaceAction, setSpaceAction] = useState<'creating' | 'leaving' | null>(null);
  const hasSpace = Boolean(space && session);
  const isTemporarySpace = space?.type === 'temporary';
  const isPersistentSpace = space?.type === 'persistent';
  const partnerJoined = memberCount >= 2;
  const cn = language === 'cn';

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
    setExplorationsLoading(true);
    try {
      const result = await listSpaceExplorations(spaceId);
      setExplorations(result.explorations);
      if (result.explorations[0]) {
        useJourneyStore.getState().setSelectedExplorationId(result.explorations[0].id);
      }
    } catch {
      setExplorations([]);
    } finally {
      setExplorationsLoading(false);
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
      setSpaceAction('creating');
      setSpaceConnecting();
      setSessionConnecting();
      const result = await createTemporarySpace(selectRelationshipSharedState(useJourneyStore.getState()));
      enterSpace(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create temporary space';
      setSpaceError(message);
      setSessionError(message);
    } finally {
      setSpaceAction(null);
    }
  };

  const handleCreatePersistentSpace = async () => {
    if (!authUser) {
      requestAuthPopover();
      setSpaceError(language === 'cn' ? '请先点击右上角登录，再创建专属关系空间。' : 'Please sign in via the top-right button to create a private relationship space.');
      return;
    }
    try {
      resetJourney();
      goToStep('home');
      setSpaceAction('creating');
      setSpaceConnecting();
      setSessionConnecting();
      const result = await createPersistentSpace(selectRelationshipSharedState(useJourneyStore.getState()), authUser.id);
      enterSpace(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create persistent space';
      setSpaceError(message);
      setSessionError(message);
    } finally {
      setSpaceAction(null);
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
      const raw = error instanceof Error ? error.message : 'Unable to join space';
      let message = raw;
      if (/already has two active members/i.test(raw)) {
        message = cn ? '该空间已有两人，无法再加入。每个空间只允许两个人。' : 'This space already has two members. Each space is limited to two people.';
      } else if (/space not found/i.test(raw)) {
        message = cn ? '找不到该空间，请检查邀请码是否正确。' : 'Space not found. Please check the invite code.';
      } else if (/expired/i.test(raw)) {
        message = cn ? '该临时空间已过期。' : 'This temporary space has expired.';
      }
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleStartExploration = async () => {
    if (!space) return;
    if (!partnerJoined) {
      setSpaceError(cn ? '请等待对方加入空间后再开启探索。把邀请码发给对方即可邀请加入。' : 'Please wait for your partner to join before starting. Share the invite code to invite them.');
      return;
    }
    if (space.type === 'temporary') {
      goToStep('setup');
      return;
    }
    if (!authUser) {
      requestAuthPopover();
      setSpaceError(cn ? '请先点击右上角登录，再开启专属空间探索。' : 'Please sign in via the top-right button to start a private exploration.');
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
      requestAuthPopover();
      setSpaceError(language === 'cn' ? '请先点击右上角登录，再升级为专属关系空间。' : 'Please sign in via the top-right button to upgrade to a private relationship space.');
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
      setSpaceAction('leaving');
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
    } finally {
      setSpaceAction(null);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!space) return;
    await navigator.clipboard?.writeText(space.invite_code);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeaveTemporarySpace = async () => {
    setSpaceAction('leaving');
    setSpaceConnecting();
    if (space) {
      try {
        await leaveSpace(space.id, authUser?.id);
      } catch {
        // 忽略离开通知失败，继续清理本地状态
      }
    }
    clearSpace();
    useSessionStore.getState().clearSession();
    resetJourney();
    setSpaceError('');
    setSessionError('');
    goToStep('home');
    setSpaceAction(null);
  };

  const handleViewSummary = () => {
    if (!summaryResonance && journeyHistoryLength === 0) {
      setSummaryNotice(language === 'cn' ? '还没有可查看的总结，请先完成一次探索。' : 'No summary yet. Please complete an exploration first.');
      window.setTimeout(() => setSummaryNotice(''), 3000);
      return;
    }
    goToStep('summary');
  };

  const friendlyError = (raw: string) => {
    if (!raw) return '';
    if (/Can't reach database server|database server is running/i.test(raw)) {
      return language === 'cn'
        ? '无法连接到数据库服务器，请检查网络或稍后再试。（临时空间和专属空间都需要数据库支持）'
        : 'Cannot reach the database server. Please check your network or try again later. (Both temporary and private spaces require database connectivity.)';
    }
    return raw;
  };

  return (
    <main className="page home-page space-home-page">
      <LoadingOverlay
        visible={spaceStatus === 'connecting'}
        message={spaceAction === 'leaving'
          ? (language === 'cn' ? '正在离开空间…' : 'Leaving space…')
          : (language === 'cn' ? '正在创建空间…' : 'Creating space…')}
      />
      <section className="space-hero">
        <span className="step-pill">Relationship OS</span>
        <h1>Love Atlas</h1>
        <p>{language === 'cn' ? '一起探索关系里的心动、差异与默契，把每一次互动沉淀成属于你们的地图。' : 'Explore the sparks, differences, and quiet understanding that shape your shared relationship map.'}</p>
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
              {spaceRole === 'owner' && (
                <>
                  <span>{language === 'cn' ? '邀请码（发给对方加入）' : 'Invite Code (share to partner)'}</span>
                  <strong>{space.invite_code}</strong>
                  <button className="invite-copy-btn" type="button" onClick={handleCopyInviteCode}>
                    {copiedCode ? (language === 'cn' ? '已复制 ✓' : 'Copied ✓') : (language === 'cn' ? '复制邀请码' : 'Copy Invite Code')}
                  </button>
                  <small>{language === 'cn' ? '你是空间创建者，把邀请码发给对方即可邀请加入。' : 'You are the space owner. Share this code to invite your partner.'}</small>
                </>
              )}
              {spaceRole !== 'owner' && (
                <small>{language === 'cn' ? '你已加入对方的空间' : 'You joined this space'}</small>
              )}
              <div className={`space-presence-hint ${partnerJoined ? 'space-presence-ready' : 'space-presence-waiting'}`}>
                {spaceRole === 'owner'
                  ? (partnerJoined
                      ? (cn ? '✓ 对方已加入，可以开启探索' : '✓ Partner joined, ready to explore')
                      : (cn ? '⏳ 等待对方加入…把邀请码发给对方' : '⏳ Waiting for partner to join… share the invite code'))
                  : (partnerJoined
                      ? (cn ? '✓ 已加入空间，可以开启探索' : '✓ Joined, ready to explore')
                      : (cn ? '⏳ 已加入空间，等待对方上线…' : '⏳ Joined, waiting for partner to come online…'))}
              </div>
              <button className="primary-btn" type="button" onClick={handleStartExploration} disabled={!partnerJoined}>
                {isTemporarySpace ? (language === 'cn' ? '开启本次探索' : 'Start This Exploration') : (language === 'cn' ? '开启新的探索' : 'Start a New Exploration')}
              </button>
              {isTemporarySpace && spaceRole === 'owner' && (
                <>
                  <button className="secondary-btn" type="button" onClick={handleCreateTemporarySpace} disabled={spaceStatus === 'connecting'}>
                    {spaceStatus === 'connecting' ? (language === 'cn' ? '创建中…' : 'Creating…') : (language === 'cn' ? '重新创建临时空间' : 'Create Another Temporary Space')}
                  </button>
                </>
              )}
              <button className="leave-space-btn" type="button" onClick={handleLeaveTemporarySpace}>
                {language === 'cn' ? '离开当前空间' : 'Leave This Space'}
              </button>
            </div>
          ) : (
            <div className="space-entry-actions">
              <div className="space-create-group">
                <button className="create-option-btn create-option-temporary" type="button" onClick={handleCreateTemporarySpace} disabled={spaceStatus === 'connecting'}>
                  <span className="create-option-title">{language === 'cn' ? '创建临时探索空间' : 'Create Temporary Space'}</span>
                  <span className="create-option-desc">{language === 'cn' ? '一次性轻量探索，适合初识或默契测试' : 'One-time lightweight exploration for first connections'}</span>
                  <span className="create-option-audience">{language === 'cn' ? '推荐：初次约会、暧昧期、想轻松破冰的情侣' : 'Best for: first dates, early-stage connections, or light icebreakers'}</span>
                </button>
                <button className="create-option-btn create-option-persistent" type="button" onClick={handleCreatePersistentSpace} disabled={spaceStatus === 'connecting'}>
                  <span className="create-option-title">{language === 'cn' ? '创建专属关系空间' : 'Create Private Space'}</span>
                  <span className="create-option-desc">{language === 'cn' ? '长期沉淀地图、发现与总结，需要登录' : 'Long-term maps, discoveries, and summaries (sign-in required)'}</span>
                  <span className="create-option-audience">{language === 'cn' ? '推荐：稳定伴侣、夫妻共同探索、长期关系成长' : 'Best for: steady partners, couples, and long-term relationship growth'}</span>
                </button>
              </div>

              <div className="space-join-divider">
                <span>{language === 'cn' ? '或加入对方的空间' : 'Or join a partner space'}</span>
              </div>

              <div className="space-join-group">
                <input
                  className="space-join-input"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder={language === 'cn' ? '输入对方空间 ID' : 'Enter partner space ID'}
                  aria-label={language === 'cn' ? '对方空间 ID' : 'Partner space ID'}
                />
                <button className="space-join-btn" type="button" onClick={handleJoinSpace} disabled={spaceStatus === 'connecting' || !joinCode.trim()}>
                  {spaceStatus === 'connecting' ? (language === 'cn' ? '加入中…' : 'Joining…') : (language === 'cn' ? '加入空间' : 'Join Space')}
                </button>
              </div>
            </div>
          )}

          {spaceStatus === 'connecting' && <small>{language === 'cn' ? '正在连接关系空间…' : 'Connecting relationship space…'}</small>}
          {spaceError && <small className="session-error">{friendlyError(spaceError)}</small>}
        </article>

        {hasSpace && isTemporarySpace && (
          <aside className="space-secondary-card">
            <span className="eyebrow">{language === 'cn' ? '临时空间' : 'Temporary Space'}</span>
            <p>{language === 'cn' ? '临时空间只保留一次探索所需的轻量功能，不展示长期地图、历史发现和累计统计。' : 'Temporary spaces keep only the lightweight one-time flow, without long-term maps, history, or stats.'}</p>
            <button type="button" onClick={handleStartExploration}>{language === 'cn' ? '开启本次探索' : 'Start This Exploration'}</button>
            <button type="button" onClick={handleViewSummary}>{language === 'cn' ? '查看本次总结' : 'View This Summary'}</button>
            {summaryNotice && <small className="session-error">{summaryNotice}</small>}
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
              {explorationsLoading
                ? (language === 'cn' ? '历史探索 加载中…' : 'Loading explorations…')
                : (language === 'cn' ? `历史探索 ${explorations.length} 次` : `${explorations.length} Past Explorations`)}
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
