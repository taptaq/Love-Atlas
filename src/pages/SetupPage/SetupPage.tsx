import { journeyLengths, relationshipStages } from '../../features/relationship/relationship.config';
import { useJourneyStore, useUiStore } from '../../store';

export function SetupPage() {
  const language = useUiStore((state) => state.language);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const setRelationshipStage = useJourneyStore((state) => state.setRelationshipStage);
  const journeyLength = useJourneyStore((state) => state.journeyLength);
  const setJourneyLength = useJourneyStore((state) => state.setJourneyLength);
  const nextStep = useJourneyStore((state) => state.nextStep);
  const goToStep = useJourneyStore((state) => state.goToStep);

  return (
    <main className="page flow-page">
      <section className="flow-header">
        <span className="step-pill">01 / {language === 'cn' ? '关系阶段' : 'Setup'}</span>
        <h1>{language === 'cn' ? '你们现在处于什么阶段？' : 'Where is your relationship now?'}</h1>
        <p>{language === 'cn' ? '关系阶段会影响目标推荐、地图路线和 Mirror Event 信号。' : 'Relationship stage shapes goal recommendations, route, and Mirror Event signals.'}</p>
      </section>

      <section className="option-grid">
        {relationshipStages.map((stage) => (
          <button
            className={`option-card ${relationshipStage === stage.id ? 'selected' : ''}`}
            key={stage.id}
            type="button"
            onClick={() => setRelationshipStage(stage.id)}
          >
            <span className="option-icon">{stage.icon}</span>
            <strong>{stage.label[language]}</strong>
            <small>{stage.description[language]}</small>
          </button>
        ))}
      </section>

      <section className="flow-header">
        <span className="step-pill">{language === 'cn' ? '旅程长度' : 'Journey Length'}</span>
        <h2>{language === 'cn' ? '今天想聊多深？' : 'How deep today?'}</h2>
        <p>{language === 'cn' ? '选择本次探索的问题数量。' : 'Choose how many questions for this exploration.'}</p>
      </section>

      <section className="option-grid">
        {journeyLengths.map((option) => (
          <button
            className={`option-card ${journeyLength === option.id ? 'selected' : ''}`}
            key={option.id}
            type="button"
            onClick={() => setJourneyLength(option.id)}
          >
            <span className="option-icon">{option.icon}</span>
            <strong>{option.label[language]}</strong>
            <small>{option.description[language]}</small>
          </button>
        ))}
      </section>

      <div className="flow-actions">
        <button type="button" onClick={() => goToStep('home')}>
          {language === 'cn' ? '返回首页' : 'Back Home'}
        </button>
        <button className="primary-btn" disabled={!relationshipStage} type="button" onClick={nextStep}>
          {language === 'cn' ? '继续生成目标' : 'Continue to Goals'}
        </button>
      </div>
    </main>
  );
}
