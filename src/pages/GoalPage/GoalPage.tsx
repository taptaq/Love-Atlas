import { mapAreaConfig } from '../../features/map/map.config';
import { getExtendedGoals } from '../../features/relationship/relationship.config';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useJourneyStore, useUiStore } from '../../store';

export function GoalPage() {
  const language = useUiStore((state) => state.language);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const goal = useJourneyStore((state) => state.goal);
  const setGoal = useJourneyStore((state) => state.setGoal);
  const nextStep = useJourneyStore((state) => state.nextStep);
  const previousStep = useJourneyStore((state) => state.previousStep);
  const sessionRole = useSessionStore((state) => state.role);
  const { recommended, extra } = getExtendedGoals(relationshipStage);
  const cn = language === 'cn';
  // 主导方模型：host 负责设置，partner 完全跟随
  const isFollower = sessionRole === 'partner';

  const renderGoalCard = (item: typeof recommended[number]) => {
    const area = mapAreaConfig[item.primaryArea];
    return (
      <button
        className={`option-card ${goal === item.id ? 'selected' : ''}`}
        key={item.id}
        type="button"
        // partner 完全跟随 host 的设置，不可操作
        disabled={isFollower}
        onClick={() => setGoal(item.id)}
      >
        <span className="option-icon">{item.icon}</span>
        <strong>{item.label[language]}</strong>
        <small>{item.description[language]}</small>
        <span className="area-badge">{area.icon} {area.label[language]}</span>
      </button>
    );
  };

  return (
    <main className="page flow-page">
      <section className="flow-header">
        <span className="step-pill">02 / {cn ? '探索目标' : 'Goal'}</span>
        <h1>{cn ? '今天想探索什么？' : 'What do you want to explore today?'}</h1>
        <p>{cn ? 'AI 根据关系阶段推荐目标，也允许你跨阶段选择更想聊的方向。' : 'AI recommends goals from your stage, but you can also pick a different direction.'}</p>
      </section>

      <section className="option-grid">
        {recommended.map(renderGoalCard)}
      </section>

      {extra.length > 0 && (
        <section className="option-grid extra-goals">
          <span className="eyebrow">{cn ? '跨阶段可选' : 'More directions'}</span>
          {extra.map(renderGoalCard)}
        </section>
      )}

      {isFollower && (
        <p className="step-lock-hint" role="status">
          {cn ? '⏳ 等待对方选择探索目标…' : '⏳ Waiting for your partner to choose the goal…'}
        </p>
      )}

      <div className="flow-actions">
        {!isFollower && (
          <button type="button" onClick={previousStep}>{cn ? '返回' : 'Back'}</button>
        )}
        <button
          className="primary-btn"
          disabled={isFollower || !goal}
          type="button"
          onClick={nextStep}
        >
          {isFollower
            ? (cn ? '等待对方继续…' : 'Waiting for partner…')
            : (cn ? '生成路线' : 'Generate Route')}
        </button>
      </div>
    </main>
  );
}
