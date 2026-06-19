import { mapAreaConfig } from '../../features/map/map.config';
import { getRecommendedGoals } from '../../features/relationship/relationship.config';
import { useJourneyStore, useUiStore } from '../../store';

export function GoalPage() {
  const language = useUiStore((state) => state.language);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const goal = useJourneyStore((state) => state.goal);
  const setGoal = useJourneyStore((state) => state.setGoal);
  const nextStep = useJourneyStore((state) => state.nextStep);
  const previousStep = useJourneyStore((state) => state.previousStep);
  const recommendedGoals = getRecommendedGoals(relationshipStage);

  return (
    <main className="page flow-page">
      <section className="flow-header">
        <span className="step-pill">02 / {language === 'cn' ? '探索目标' : 'Goal'}</span>
        <h1>{language === 'cn' ? '今天想探索什么？' : 'What do you want to explore today?'}</h1>
        <p>{language === 'cn' ? 'AI 根据关系阶段推荐目标，并映射到关系地图区域。' : 'AI recommends goals from your stage and maps them to a relationship area.'}</p>
      </section>

      <section className="option-grid">
        {recommendedGoals.map((item) => {
          const area = mapAreaConfig[item.primaryArea];
          return (
            <button
              className={`option-card ${goal === item.id ? 'selected' : ''}`}
              key={item.id}
              type="button"
              onClick={() => setGoal(item.id)}
            >
              <span className="option-icon">{item.icon}</span>
              <strong>{item.label[language]}</strong>
              <small>{item.description[language]}</small>
              <span className="area-badge">{area.icon} {area.label[language]}</span>
            </button>
          );
        })}
      </section>

      <div className="flow-actions">
        <button type="button" onClick={previousStep}>{language === 'cn' ? '返回' : 'Back'}</button>
        <button className="primary-btn" disabled={!goal} type="button" onClick={nextStep}>
          {language === 'cn' ? '生成路线' : 'Generate Route'}
        </button>
      </div>
    </main>
  );
}
