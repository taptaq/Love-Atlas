import { useEffect, useState } from 'react';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { loadSpaceManagement, unbindPersistentSpace } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { t } from '../../i18n';
import { formatDate, presenceLabel } from '../../lib/format';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useJourneyStore, useUiStore } from '../../store';
import type { SpaceManagementResult } from '../../types/space';

export function SpaceManagementPage() {
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const resetJourney = useJourneyStore((state) => state.resetJourney);
  const space = useSpaceStore((state) => state.space);
  const clearSpace = useSpaceStore((state) => state.clearSpace);
  const clearSession = useSessionStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [detail, setDetail] = useState<SpaceManagementResult | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUnbinding, setIsUnbinding] = useState(false);

  useEffect(() => {
    if (!space) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void loadSpaceManagement(space.id).then(setDetail).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load space')).finally(() => setIsLoading(false));
  }, [space]);

  const handleCopyInvite = async () => {
    if (!space) return;
    await navigator.clipboard?.writeText(space.invite_code);
    setMessage(language === 'cn' ? '邀请 ID 已复制。' : 'Invite ID copied.');
  };

  const handleUnbind = async () => {
    if (!space || !user) {
      setMessage(language === 'cn' ? '请先登录后再管理专属空间。' : 'Please sign in before managing this space.');
      return;
    }
    setIsUnbinding(true);
    try {
      const result = await unbindPersistentSpace(space.id, user.id);
      if (result.space.status === 'unbound') {
        clearSpace();
        clearSession();
        resetJourney();
        goToStep('home');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (language === 'cn' ? '解绑失败，请稍后重试' : 'Unbind failed, please try again'));
    } finally {
      setIsUnbinding(false);
    }
  };

  if (!space) {
    return (
      <main className="page flow-page">
        <button className="back-link" type="button" onClick={() => goToStep('home')}>← {t(language, 'back')}</button>
        <section className="flow-header">
          <h1>{language === 'cn' ? '暂无可管理空间' : 'No space to manage'}</h1>
          <p>{language === 'cn' ? '请先创建或加入一个关系空间。' : 'Create or join a relationship space first.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page flow-page space-management-page">
      <LoadingOverlay visible={isLoading} message={language === 'cn' ? '正在加载空间状态…' : 'Loading space status…'} />
      <button className="back-link" type="button" onClick={() => goToStep('home')}>← {t(language, 'back')}</button>
      <section className="flow-header">
        <span className="step-pill">{language === 'cn' ? '空间管理' : 'Space Management'}</span>
        <h1>{language === 'cn' ? '管理你们的专属关系空间' : 'Manage your private relationship space'}</h1>
        <p>{language === 'cn' ? '查看空间状态、成员、邀请 ID 和历史探索入口。' : 'Review space status, members, invite ID, and history shortcuts.'}</p>
      </section>

      <section className="space-management-grid">
        <article className="management-card management-card-highlight">
          <span className="eyebrow">{language === 'cn' ? '邀请 ID' : 'Invite ID'}</span>
          <strong className="invite-code-display">{space.invite_code}</strong>
          <p>{language === 'cn' ? '把这个 ID 发给对方，对方可以加入你的关系空间。' : 'Share this ID so your partner can join this relationship space.'}</p>
          <button type="button" onClick={handleCopyInvite}>{language === 'cn' ? '复制邀请 ID' : 'Copy invite ID'}</button>
        </article>

        {user && (
          <article className="management-card">
            <span className="eyebrow">{language === 'cn' ? '专属用户 ID' : 'Your User ID'}</span>
            <strong className="user-id-display">{user.id}</strong>
            {user.email && <p>{user.email}</p>}
            <p>{language === 'cn' ? '这是你在专属关系空间中的身份标识，用于绑定与管理你创建的空间。' : 'This is your identity for private spaces, used to bind and manage spaces you create.'}</p>
          </article>
        )}

        <article className="management-card">
          <span className="eyebrow">{language === 'cn' ? '空间状态' : 'Space Status'}</span>
          <div className="management-stat-row"><span>{language === 'cn' ? '类型' : 'Type'}</span><strong>{space.type}</strong></div>
          <div className="management-stat-row"><span>{language === 'cn' ? '状态' : 'Status'}</span><strong>{space.status}</strong></div>
          {isLoading ? (
            <div className="detail-skeleton-list detail-skeleton-list-compact" aria-label={language === 'cn' ? '正在加载空间状态' : 'Loading space status'}>
              <span />
              <span />
            </div>
          ) : (
            <>
              <div className="management-stat-row"><span>{language === 'cn' ? '探索次数' : 'Explorations'}</span><strong>{detail?.explorationCount ?? 0}</strong></div>
              <div className="management-stat-row"><span>{language === 'cn' ? '最近探索' : 'Latest'}</span><strong>{formatDate(language, detail?.latestExploration?.created_at ?? null)}</strong></div>
            </>
          )}
        </article>

        <article className="management-card management-card-wide">
          <span className="eyebrow">{language === 'cn' ? '成员状态' : 'Members'}</span>
          <div className="member-list">
            {isLoading ? (
              <div className="detail-loading-state detail-loading-state-inline" aria-label={language === 'cn' ? '正在加载成员状态' : 'Loading members'}>
                <div className="loading-orbit" />
                <strong>{language === 'cn' ? '正在同步成员状态' : 'Syncing member status'}</strong>
                <p>{language === 'cn' ? '上线状态和加入时间会马上出现。' : 'Presence and join time will appear shortly.'}</p>
              </div>
            ) : (detail?.members ?? []).map((member) => (
              <div className="member-row" key={member.id}>
                <strong>{member.role}</strong>
                <span>{presenceLabel(language, member.last_seen_at)}</span>
                <small>{language === 'cn' ? '加入：' : 'Joined: '}{formatDate(language, member.joined_at)}</small>
                <small>{language === 'cn' ? '最后在线：' : 'Last seen: '}{formatDate(language, member.last_seen_at)}</small>
              </div>
            ))}
            {!isLoading && detail && detail.members.length === 0 && (
              <div className="detail-empty-state detail-empty-state-compact">
                <strong>{language === 'cn' ? '暂无成员记录' : 'No member records'}</strong>
                <p>{language === 'cn' ? '对方加入后，会在这里看到成员与在线状态。' : 'Members and presence will appear after someone joins.'}</p>
              </div>
            )}
          </div>
        </article>

        <article className="management-card management-card-wide">
          <span className="eyebrow">{language === 'cn' ? '快捷入口' : 'Shortcuts'}</span>
          <div className="management-actions">
            <button type="button" onClick={() => goToStep('explorationHistory')}>{language === 'cn' ? '历史探索' : 'Exploration History'}</button>
            <button type="button" onClick={() => goToStep('world')}>{t(language, 'worldTitle')}</button>
            <button type="button" onClick={() => goToStep('spaceLibrary')}>{language === 'cn' ? '长期沉淀' : 'Long-term Library'}</button>
            <button type="button" onClick={handleUnbind} disabled={isUnbinding}>{isUnbinding ? (language === 'cn' ? '解绑中…' : 'Unbinding…') : (language === 'cn' ? '解绑专属空间' : 'Unbind Space')}</button>
          </div>
          {message && <small>{message}</small>}
        </article>
      </section>
    </main>
  );
}
