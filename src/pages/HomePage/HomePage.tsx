import { useEffect, useState } from 'react';
import { requestAuthPopover } from '../../components/auth/AuthButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
// import { DailyQuestion } from '../../components/ui/DailyQuestion'; // 今日一问：暂时下线
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { SpaceOnboarding } from '../../components/ui/SpaceOnboarding';
import { TermTooltip } from '../../components/ui/TermTooltip';
import { WeeklyBlindBox } from '../../components/ui/WeeklyBlindBox';
import { friendlyError } from '../../utils/friendlyError';
// import type { WeeklyTheme } from '../../services/weeklyBlindBoxService'; // 盲盒开始按钮已移除
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { createPersistentExploration, createPersistentSpace, createTemporarySpace, findMyPersistentSpace, joinRelationshipSpace, leaveSpace, loadExplorationSharedState, listSpaceExplorations, unbindPersistentSpace, upgradeTemporarySpace } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { selectRelationshipSharedState } from '../../features/session/useRelationshipSessionSync';
import { t } from '../../i18n';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import type { ExplorationSession, SpaceApiResult } from '../../types/space';
// import type { JourneyQuestion } from '../../types'; // 今日一问：暂时下线

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
  const isCompanion = useSpaceStore((store) => store.isCompanion);
  const latestCopy = latest ? getDiscoveryCopy(latest, language) : null;
  const authUser = useAuthStore((store) => store.user);
  const [joinCode, setJoinCode] = useState('');
  const [explorations, setExplorations] = useState<ExplorationSession[]>([]);
  const [explorationsLoading, setExplorationsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [summaryNotice, setSummaryNotice] = useState('');
  const [spaceAction, setSpaceAction] = useState<'creating' | 'leaving' | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<'leave' | 'unbind' | null>(null);
  const hasSpace = Boolean(space && session);
  const isTemporarySpace = space?.type === 'temporary';
  const isPersistentSpace = space?.type === 'persistent';
  const partnerJoined = memberCount >= 2;
  const cn = language === 'cn';

  const enterSpace = (result: SpaceApiResult, companion = false) => {
    setSpace(result.space, result.exploration, result.role, companion);
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
      const result = await createTemporarySpace(selectRelationshipSharedState(useJourneyStore.getState()), false, authUser?.id);
      enterSpace(result);
    } catch (error) {
      const message = friendlyError(error, language);
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
      // 真人双人永久空间：companion=false。若已有则直接进入，避免重复创建报错
      const existing = await findMyPersistentSpace(false);
      if (existing.space && existing.exploration && existing.session && existing.role) {
        enterSpace({ space: existing.space, exploration: existing.exploration, session: existing.session, role: existing.role }, false);
        return;
      }
      const result = await createPersistentSpace(selectRelationshipSharedState(useJourneyStore.getState()), authUser.id, false);
      enterSpace(result, false);
    } catch (error) {
      const message = friendlyError(error, language);
      setSpaceError(message);
      setSessionError(message);
    } finally {
      setSpaceAction(null);
    }
  };

  // 虚拟伴侣模式：让评审无需真实伴侣即可走完整个流程，AI 扮演对方回答
  const handleCreateCompanionTemporarySpace = async () => {
    try {
      resetJourney();
      goToStep('home');
      setSpaceAction('creating');
      setSpaceConnecting();
      setSessionConnecting();
      const result = await createTemporarySpace(selectRelationshipSharedState(useJourneyStore.getState()), true, authUser?.id);
      enterSpace(result, true);
    } catch (error) {
      const message = friendlyError(error, language);
      setSpaceError(message);
      setSessionError(message);
    } finally {
      setSpaceAction(null);
    }
  };

  const handleCreateCompanionPersistentSpace = async () => {
    if (!authUser) {
      requestAuthPopover();
      setSpaceError(cn ? '请先点击右上角登录，再创建专属关系空间。' : 'Please sign in via the top-right button to create a private relationship space.');
      return;
    }
    try {
      resetJourney();
      goToStep('home');
      setSpaceAction('creating');
      setSpaceConnecting();
      setSessionConnecting();
      // 虚拟伴侣永久空间：companion=true。若已有则直接进入，避免重复创建报错
      const existing = await findMyPersistentSpace(true);
      if (existing.space && existing.exploration && existing.session && existing.role) {
        enterSpace({ space: existing.space, exploration: existing.exploration, session: existing.session, role: existing.role }, true);
        return;
      }
      const result = await createPersistentSpace(selectRelationshipSharedState(useJourneyStore.getState()), authUser.id, true);
      enterSpace(result, true);
    } catch (error) {
      const message = friendlyError(error, language);
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
      const message = friendlyError(error, language);
      setSpaceError(message);
      setSessionError(message);
    }
  };

  const handleStartExploration = async () => {
    if (!space) return;
    if (!partnerJoined && !isCompanion) {
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
      enterSpace(result, isCompanion);
      goToStep('setup');
    } catch (error) {
      const message = friendlyError(error, language);
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
      setSpaceAction('creating');
      setSpaceConnecting();
      setSessionConnecting();
      // 升级保留当前模式：虚拟伴侣临时空间 → 虚拟伴侣永久空间；真人临时空间 → 真人永久空间
      const upgradeCompanion = isCompanion;
      // 若已有同模式专属永久空间，直接进入已有空间，避免升级时 assertCanUsePersistentSpace 报错
      const existing = await findMyPersistentSpace(upgradeCompanion);
      if (existing.space && existing.exploration && existing.session && existing.role) {
        enterSpace({ space: existing.space, exploration: existing.exploration, session: existing.session, role: existing.role }, upgradeCompanion);
        return;
      }
      const result = await upgradeTemporarySpace(space.id, authUser.id, upgradeCompanion);
      enterSpace(result, upgradeCompanion);
    } catch (error) {
      const message = friendlyError(error, language);
      setSpaceError(message);
      setSessionError(message);
    } finally {
      setSpaceAction(null);
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
      const message = friendlyError(error, language);
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

  // 今日一问：跳过 setup/goal/route，直接用预设问题进入旅程（暂时下线）
  // const handleStartDailyQuestion = (question: JourneyQuestion) => {
  //   const store = useJourneyStore.getState();
  //   if (hasSpace && (partnerJoined || isCompanion)) {
  //     store.startJourneyWithDailyQuestion(question);
  //     return;
  //   }
  //   if (hasSpace && !partnerJoined && !isCompanion) {
  //     setSpaceError(cn ? '问题已准备好，请等待对方加入空间后再开启探索。' : 'Question is ready. Please wait for your partner to join before starting.');
  //     return;
  //   }
  //   // 没有空间：先创建临时空间，再开始
  //   void handleCreateTemporarySpace().then(() => {
  //     useJourneyStore.getState().startJourneyWithDailyQuestion(question);
  //   });
  // };

  return (
    <main className="page home-page space-home-page">
      <LoadingOverlay
        visible={spaceStatus === 'connecting'}
        message={spaceAction === 'leaving'
          ? (language === 'cn' ? '正在离开空间…' : 'Leaving space…')
          : (language === 'cn' ? '正在创建空间…' : 'Creating space…')}
      />
      {space && session && (
        <SpaceOnboarding spaceId={space.id} role={spaceRole ?? ''} spaceType={space.type} />
      )}
      <ConfirmDialog
        visible={pendingConfirm === 'leave'}
        title={cn ? '确定离开空间？' : 'Leave this space?'}
        message={cn ? '离开后临时空间将被删除，本次对话记录无法恢复。' : 'The temporary space will be deleted and this conversation cannot be recovered.'}
        confirmLabel={cn ? '确定离开' : 'Leave'}
        cancelLabel={cn ? '再想想' : 'Stay'}
        danger
        onConfirm={() => { setPendingConfirm(null); void handleLeaveTemporarySpace(); }}
        onCancel={() => setPendingConfirm(null)}
      />
      <ConfirmDialog
        visible={pendingConfirm === 'unbind'}
        title={cn ? '确定解绑专属空间？' : 'Unbind this space?'}
        message={cn ? '解绑后你将退出这个关系空间，但空间记录仍会保留。' : 'You will leave this relationship space, but the space records will be kept.'}
        confirmLabel={cn ? '确定解绑' : 'Unbind'}
        cancelLabel={cn ? '再想想' : 'Cancel'}
        danger
        onConfirm={() => { setPendingConfirm(null); void handleUnbindSpace(); }}
        onCancel={() => setPendingConfirm(null)}
      />
      <section className="space-hero">
        <span className="step-pill">{language === 'cn' ? '深度对话启动器' : 'Deep Conversation Starter'}</span>
        <h1>Love Atlas</h1>
        <p>
          {language === 'cn' ? (
            <>从一次<TermTooltip explanation={{ cn: '通过问答和镜像时刻，发现彼此真实想法的过程', en: 'A guided Q&A and mirror-moment journey to discover each other' }}>深度对话</TermTooltip>开始，看见彼此真实的样子，把每次交心<TermTooltip explanation={{ cn: '把每次探索的结果保存下来，慢慢积累成你们的关系地图', en: 'Save each exploration to gradually build your relationship map' }}>沉淀</TermTooltip>成你们的关系地图。</>
          ) : (
            <>Start with one deep conversation — see each other truly, and let every heartfelt exchange shape your shared map.</>
          )}
        </p>
      </section>

      {hasSpace && <WeeklyBlindBox />}

      {/* 今日一问：暂时下线 */}
      {/* <DailyQuestion onStart={handleStartDailyQuestion} /> */}

      <section className={hasSpace ? 'space-entry-layout' : 'space-entry-layout space-entry-layout-single'}>
        <article className="space-primary-card">
          <span className="card-icon">💞</span>
          <span className="eyebrow">
            {language === 'cn' ? (
              <TermTooltip explanation={{ cn: '你和对方共同进入的私密对话区域，同步状态、共享探索进度', en: 'A private shared area where you and your partner sync state and explore together' }}>空间入口</TermTooltip>
            ) : (
              'Space Entry'
            )}
          </span>
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
                ? language === 'cn' ? '适合一次深度破冰对话——初识、相亲或想认真聊聊的两个人。' : 'A one-time space for a deep ice-breaking conversation — for new connections or first real talks.'
                : language === 'cn' ? '只属于你们的长期对话空间，每次深聊都会沉淀成关系地图。' : 'Your private space for ongoing deep conversations — every talk shapes your shared map.'
              : language === 'cn' ? '创建临时空间来一次深度对话，或开启专属空间持续积累。' : 'Start a temporary space for one deep talk, or a private space for ongoing depth.'}
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
              <div className={`space-presence-hint ${(partnerJoined || isCompanion) ? 'space-presence-ready' : 'space-presence-waiting'}`}>
                {isCompanion
                  ? (cn ? '🤖 虚拟伴侣模式 · 可直接开启探索' : '🤖 Virtual Companion mode · ready to explore')
                  : spaceRole === 'owner'
                    ? (partnerJoined
                        ? (cn ? '✓ 对方已加入，可以开启探索' : '✓ Partner joined, ready to explore')
                        : (cn ? '⏳ 等待对方加入…把邀请码发给对方' : '⏳ Waiting for partner to join… share the invite code'))
                    : (partnerJoined
                        ? (cn ? '✓ 已加入空间，可以开启探索' : '✓ Joined, ready to explore')
                        : (cn ? '⏳ 已加入空间，等待对方上线…' : '⏳ Joined, waiting for partner to come online…'))}
              </div>
              <button className="primary-btn" type="button" onClick={handleStartExploration} disabled={!partnerJoined && !isCompanion}>
                {isTemporarySpace ? (language === 'cn' ? '开启本次探索' : 'Start This Exploration') : (language === 'cn' ? '开启新的探索' : 'Start a New Exploration')}
              </button>
              {isTemporarySpace && spaceRole === 'owner' && (
                <>
                  <button className="secondary-btn" type="button" onClick={handleCreateTemporarySpace} disabled={spaceStatus === 'connecting'}>
                    {spaceStatus === 'connecting' ? (language === 'cn' ? '创建中…' : 'Creating…') : (language === 'cn' ? '重新创建临时空间' : 'Create Another Temporary Space')}
                  </button>
                </>
              )}
              <button className="leave-space-btn" type="button" onClick={() => setPendingConfirm('leave')}>
                {language === 'cn' ? '离开当前空间' : 'Leave This Space'}
              </button>
            </div>
          ) : (
            <div className="space-entry-actions">
              <div className="space-create-group">
                <button className="create-option-btn create-option-temporary" type="button" onClick={handleCreateTemporarySpace} disabled={spaceStatus === 'connecting'}>
                  <span className="create-option-title">{language === 'cn' ? '创建临时探索空间' : 'Create Temporary Space'}</span>
                  <span className="create-option-desc">{language === 'cn' ? '一次性轻量探索，适合初识或默契测试' : 'One-time lightweight exploration for first connections'}</span>
                  <span className="create-option-audience">{language === 'cn' ? '推荐：初次约会、暧昧期、想认真聊聊的两个人' : 'Best for: first dates, early-stage connections, or your first real talk'}</span>
                </button>
                <button className="create-option-btn create-option-persistent" type="button" onClick={handleCreatePersistentSpace} disabled={spaceStatus === 'connecting'}>
                  <span className="create-option-title">{language === 'cn' ? '创建专属关系空间' : 'Create Private Space'}</span>
                  <span className="create-option-desc">{language === 'cn' ? '长期沉淀地图、发现与总结，需要登录' : 'Long-term maps, discoveries, and summaries (sign-in required)'}</span>
                  <span className="create-option-audience">{language === 'cn' ? '推荐：稳定伴侣、夫妻、想持续深度对话的关系' : 'Best for: steady partners, couples, and ongoing deep conversations'}</span>
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

              <div className="companion-demo-group">
                <div className="companion-demo-divider">
                  <span>{language === 'cn' ? '评审快速体验（虚拟伴侣）' : 'Reviewer Quick Demo (Virtual Companion)'}</span>
                </div>
                <p className="companion-demo-hint">{language === 'cn' ? '没有真实伴侣也能走完整个流程——AI 会扮演对方回答每一题。' : 'Experience the full flow solo — AI plays your partner for every question.'}</p>
                <div className="companion-demo-actions">
                  <button className="create-option-btn create-option-companion" type="button" onClick={handleCreateCompanionTemporarySpace} disabled={spaceStatus === 'connecting'}>
                    <span className="create-option-title">{language === 'cn' ? '虚拟伴侣 · 临时空间' : 'Virtual Companion · Temporary'}</span>
                    <span className="create-option-desc">{language === 'cn' ? 'AI 扮演对方，快速体验一次完整探索' : 'AI plays your partner for one full exploration'}</span>
                  </button>
                  <button className="create-option-btn create-option-companion" type="button" onClick={handleCreateCompanionPersistentSpace} disabled={spaceStatus === 'connecting'}>
                    <span className="create-option-title">{language === 'cn' ? '虚拟伴侣 · 专属空间' : 'Virtual Companion · Private'}</span>
                    <span className="create-option-desc">{language === 'cn' ? 'AI 扮演对方，体验长期沉淀与地图（需登录）' : 'AI plays your partner for long-term maps (sign-in required)'}</span>
                  </button>
                </div>
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
            <span className="eyebrow">{t(language, 'insidePrivateSpace')}</span>
            <div className="space-flow-list">
              <span>{t(language, 'stepSetup')}</span>
              <span>{t(language, 'stepGoal')}</span>
              <span>{t(language, 'stepRoute')}</span>
              <span>{t(language, 'stepAB')}</span>
              <span>{t(language, 'stepMirror')}</span>
              <span>{t(language, 'stepSummary')}</span>
            </div>
            <button type="button" onClick={handleStartExploration}>{t(language, 'startNewExploration')}</button>
            <button type="button" onClick={() => goToStep('world')}>{t(language, 'worldTitle')}</button>
            <button type="button" onClick={() => goToStep('discoveryAtlas')}>
              {latest ? `${t(language, 'latestDiscovery')} · ${latestCopy?.title}` : t(language, 'emptyDiscovery')}
            </button>
            <button type="button" onClick={() => goToStep('spaceManagement')}>{t(language, 'manageSpace')}</button>
            <button type="button" onClick={() => goToStep('spaceLibrary')}>{t(language, 'longTermLibrary')}</button>
            <button type="button" onClick={handleOpenHistory}>
              {explorationsLoading
                ? (language === 'cn' ? '历史探索 加载中…' : 'Loading explorations…')
                : (language === 'cn' ? `历史探索 ${explorations.length} 次` : `${explorations.length} ${t(language, 'pastExplorations')}`)}
            </button>
            <button type="button" onClick={() => setPendingConfirm('unbind')}>{t(language, 'unbindPrivateSpace')}</button>
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
