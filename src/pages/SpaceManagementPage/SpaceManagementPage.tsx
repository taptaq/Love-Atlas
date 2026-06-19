import { useEffect, useState } from 'react';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { loadSpaceManagement, unbindPersistentSpace } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { t } from '../../i18n';
import { useJourneyStore, useUiStore } from '../../store';
import type { SpaceManagementResult } from '../../types/space';

function formatDate(language: 'cn' | 'en', value: string | null) {
  if (!value) return language === 'cn' ? '暂无' : 'Not yet';
  return new Date(value).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function presenceLabel(language: 'cn' | 'en', value: string | null) {
  if (!value) return language === 'cn' ? '未上线' : 'Never seen';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 2) return language === 'cn' ? '在线' : 'Online';
  if (minutes < 10) return language === 'cn' ? '刚刚在线' : 'Recently online';
  return language === 'cn' ? '离线' : 'Offline';
}

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

  useEffect(() => {
    if (!space) return;
    void loadSpaceManagement(space.id).then(setDetail).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load space'));
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
    const result = await unbindPersistentSpace(space.id, user.id);
    if (result.space.status === 'unbound') {
      clearSpace();
      clearSession();
      resetJourney();
      goToStep('home');
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

        <article className="management-card">
          <span className="eyebrow">{language === 'cn' ? '空间状态' : 'Space Status'}</span>
          <div className="management-stat-row"><span>{language === 'cn' ? '类型' : 'Type'}</span><strong>{space.type}</strong></div>
          <div className="management-stat-row"><span>{language === 'cn' ? '状态' : 'Status'}</span><strong>{space.status}</strong></div>
          <div className="management-stat-row"><span>{language === 'cn' ? '探索次数' : 'Explorations'}</span><strong>{detail?.explorationCount ?? 0}</strong></div>
          <div className="management-stat-row"><span>{language === 'cn' ? '最近探索' : 'Latest'}</span><strong>{formatDate(language, detail?.latestExploration?.created_at ?? null)}</strong></div>
        </article>

        <article className="management-card management-card-wide">
          <span className="eyebrow">{language === 'cn' ? '成员状态' : 'Members'}</span>
          <div className="member-list">
            {(detail?.members ?? []).map((member) => (
              <div className="member-row" key={member.id}>
                <strong>{member.role}</strong>
                <span>{presenceLabel(language, member.last_seen_at)}</span>
                <small>{language === 'cn' ? '加入：' : 'Joined: '}{formatDate(language, member.joined_at)}</small>
                <small>{language === 'cn' ? '最后在线：' : 'Last seen: '}{formatDate(language, member.last_seen_at)}</small>
              </div>
            ))}
            {detail && detail.members.length === 0 && <p>{language === 'cn' ? '暂无成员记录。' : 'No member records yet.'}</p>}
          </div>
        </article>

        <article className="management-card management-card-wide">
          <span className="eyebrow">{language === 'cn' ? '快捷入口' : 'Shortcuts'}</span>
          <div className="management-actions">
            <button type="button" onClick={() => goToStep('explorationHistory')}>{language === 'cn' ? '历史探索' : 'Exploration History'}</button>
            <button type="button" onClick={() => goToStep('world')}>{t(language, 'worldTitle')}</button>
            <button type="button" onClick={() => goToStep('spaceLibrary')}>{language === 'cn' ? '长期沉淀' : 'Long-term Library'}</button>
            <button type="button" onClick={handleUnbind}>{language === 'cn' ? '解绑专属空间' : 'Unbind Space'}</button>
          </div>
          {message && <small>{message}</small>}
        </article>
      </section>
    </main>
  );
}
