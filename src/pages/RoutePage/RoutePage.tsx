import { useEffect, useRef, useState } from 'react';
import { generateAiRoute } from '../../features/relationship/aiRouteService';
import { mapAreaConfig } from '../../features/map/map.config';
import { getMomentInfluence, inferImageTags } from '../../features/presentMoment/presentMomentEngine';
import { getGoalOption, getStageOption } from '../../features/relationship/relationship.config';
import { getRecommendedRouteAreas } from '../../features/relationship/routePlanner';
import { uploadPresentMomentImage } from '../../features/session/storageService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useJourneyStore, useUiStore } from '../../store';
import type { MapArea, MomentScene } from '../../types';

const scenes: Array<{ id: MomentScene; icon: string; cn: string; en: string }> = [
  { id: 'cafe', icon: '☕️', cn: '咖啡馆', en: 'Cafe' },
  { id: 'night', icon: '🌙', cn: '夜晚', en: 'Night' },
  { id: 'travel', icon: '🚗', cn: '旅途中', en: 'Travel' },
  { id: 'home', icon: '🏡', cn: '家里', en: 'Home' },
  { id: 'conflict', icon: '🌧', cn: '刚有摩擦', en: 'After friction' },
];

type MomentAction = 'none' | 'scene' | 'text' | 'image';

export function RoutePage() {
  const language = useUiStore((state) => state.language);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const goal = useJourneyStore((state) => state.goal);
  const route = useJourneyStore((state) => state.route);
  const presentMoment = useJourneyStore((state) => state.presentMoment);
  const sessionId = useSessionStore((state) => state.session?.id);
  const applyPresentMoment = useJourneyStore((state) => state.applyPresentMoment);
  const startJourney = useJourneyStore((state) => state.startJourney);
  const previousStep = useJourneyStore((state) => state.previousStep);
  const [momentText, setMomentText] = useState(presentMoment.text);
  const [activeMomentAction, setActiveMomentAction] = useState<MomentAction>('none');
  const [appliedHint, setAppliedHint] = useState('');
  const appliedHintTimer = useRef<number | undefined>(undefined);
  const [aiRouteAreas, setAiRouteAreas] = useState<MapArea[] | null>(null);
  const [aiRouteReason, setAiRouteReason] = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  const [aiFallback, setAiFallback] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const stage = getStageOption(relationshipStage);
  const goalOption = getGoalOption(goal);

  // AI 生成路线，失败时用固定组合兜底
  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    generateAiRoute({ stage: relationshipStage, goal, language })
      .then((result) => {
        if (cancelled) return;
        setAiRouteAreas(result.areas);
        setAiRouteReason(result.reason);
        setAiFallback(false);
      })
      .catch(() => {
        if (cancelled) return;
        // 兜底：使用固定组合
        const fallbackAreas = getRecommendedRouteAreas(relationshipStage, goal);
        setAiRouteAreas(fallbackAreas);
        setAiRouteReason('');
        setAiFallback(true);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(appliedHintTimer.current);
    };
  }, [relationshipStage, goal, language]);

  const routeAreas = aiRouteAreas ?? (route.areas.length > 0 ? route.areas : goalOption ? [goalOption.primaryArea] : []);
  const routeReason = aiRouteReason || (typeof route.reason === 'string' ? route.reason : route.reason?.[language]);

  const showAppliedHint = (message: string) => {
    setAppliedHint(message);
    window.clearTimeout(appliedHintTimer.current);
    appliedHintTimer.current = window.setTimeout(() => setAppliedHint(''), 2000);
  };

  const applyMoment = (scene: MomentScene) => {
    const routeInfluence = getMomentInfluence(scene, momentText, presentMoment.imageTags);
    applyPresentMoment({ scene, text: momentText, routeInfluence });
    showAppliedHint(language === 'cn' ? '场景已应用' : 'Scene applied');
  };

  const applyTextMoment = () => {
    if (!momentText.trim()) return;
    const routeInfluence = getMomentInfluence(presentMoment.scene, momentText, presentMoment.imageTags);
    applyPresentMoment({ text: momentText, routeInfluence });
    showAppliedHint(language === 'cn' ? '句子已应用' : 'Note applied');
  };

  const skipMoment = () => {
    setActiveMomentAction('none');
    setMomentText('');
    applyPresentMoment({ scene: '', text: '', image: null, imagePreview: '', imageTags: [], captureMode: null, routeInfluence: null });
    showAppliedHint(language === 'cn' ? '已跳过此刻信息' : 'Moment skipped');
  };

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const localPreview = typeof reader.result === 'string' ? reader.result : '';
      let imagePreview = localPreview;
      try {
        imagePreview = (await uploadPresentMomentImage(sessionId, file)) ?? localPreview;
      } catch {
        imagePreview = localPreview;
      } finally {
        setImageUploading(false);
      }
      const imageTags = inferImageTags(file.name, momentText);
      const routeInfluence = getMomentInfluence(presentMoment.scene, momentText, imageTags);
      applyPresentMoment({
        text: momentText,
        image: file.name,
        imagePreview,
        imageTags,
        captureMode: 'upload',
        routeInfluence,
      });
      showAppliedHint(language === 'cn' ? '图片已应用' : 'Image applied');
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="page flow-page">
      <LoadingOverlay visible={aiLoading} message={language === 'cn' ? 'AI 正在生成你们今天的路线…' : 'AI is generating today\u2019s route…'} />
      <LoadingOverlay visible={imageUploading} message={language === 'cn' ? '正在上传图片…' : 'Uploading image…'} />
      <section className="flow-header">
        <span className="step-pill">03 / {language === 'cn' ? '路线引擎' : 'Route Engine'}</span>
        <h1>{aiLoading ? (language === 'cn' ? 'AI 正在生成你们今天的路线…' : 'AI is generating today\u2019s route…') : (language === 'cn' ? 'AI 已生成你们今天的路线' : 'AI has generated today\u2019s route')}</h1>
        <p>{language === 'cn' ? '关系阶段、探索目标和此刻场景会共同影响路线。' : 'Stage, goal, and present moment jointly shape the route.'}</p>
      </section>

      <section className="context-grid">
        <article className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? '关系背景' : 'Relationship Context'}</span>
          <h2>{stage?.icon} {stage?.label[language] ?? '-'}</h2>
          <p>{stage?.description[language] ?? '-'}</p>
        </article>
        <article className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? '目标信号' : 'Goal Signal'}</span>
          <h2>{goalOption?.icon} {goalOption?.label[language] ?? '-'}</h2>
          <p>{goalOption?.routeReason[language] ?? '-'}</p>
        </article>
      </section>

      <section className="route-preview-card recommended-route-card">
        <span className="eyebrow">{language === 'cn' ? '推荐路线' : 'Recommended Route'}</span>
        {aiLoading ? (
          <h2>{language === 'cn' ? '⏳ AI 生成中…' : '⏳ AI generating…'}</h2>
        ) : (
          <h2>{routeAreas.map((area) => `${mapAreaConfig[area].icon} ${mapAreaConfig[area].label[language]}`).join(' → ')}</h2>
        )}
        <p>{routeReason || goalOption?.routeReason[language] || (language === 'cn' ? 'AI 会根据关系阶段和探索目标生成今天的路线。' : 'AI generates today\u2019s route from your relationship stage and goal.')}</p>
        {aiFallback && !aiLoading && (
          <p className="ai-fallback-hint">{language === 'cn' ? '⚠️ AI 暂不可用，已使用默认路线' : '⚠️ AI unavailable, using default route'}</p>
        )}
        {!aiLoading && (
          <div className="route-node-list">
            {routeAreas.map((area) => (
              <div className="route-node" key={area}>
                <span>{mapAreaConfig[area].icon}</span>
                <strong>{mapAreaConfig[area].label[language]}</strong>
                <small>{mapAreaConfig[area].description[language]}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="route-preview-card present-moment-card">
        <span className="eyebrow">{language === 'cn' ? '此刻信息' : 'Present Moment'}</span>
        <h2>{language === 'cn' ? '此刻信息是可选的' : 'Present moment is optional'}</h2>
        <p>{language === 'cn' ? '可以直接开始，也可以选择一种方式补充当前情境。' : 'You can begin directly, or add context in one lightweight way.'}</p>
        <div className="moment-action-grid">
          <button className={activeMomentAction === 'none' ? 'selected' : ''} type="button" onClick={skipMoment}>
            <span>✨</span>
            <strong>{language === 'cn' ? '暂不补充' : 'Skip for now'}</strong>
            <small>{language === 'cn' ? '直接使用当前路线' : 'Use the route as is'}</small>
          </button>
          <button className={activeMomentAction === 'scene' ? 'selected' : ''} type="button" onClick={() => setActiveMomentAction('scene')}>
            <span>📍</span>
            <strong>{language === 'cn' ? '选择场景' : 'Choose scene'}</strong>
            <small>{language === 'cn' ? '用所在场景修正路线' : 'Shape the route by place'}</small>
          </button>
          <button className={activeMomentAction === 'text' ? 'selected' : ''} type="button" onClick={() => setActiveMomentAction('text')}>
            <span>✍️</span>
            <strong>{language === 'cn' ? '写一句话' : 'Write a note'}</strong>
            <small>{language === 'cn' ? '记录刚刚发生的事' : 'Capture what just happened'}</small>
          </button>
          <button className={activeMomentAction === 'image' ? 'selected' : ''} type="button" onClick={() => setActiveMomentAction('image')}>
            <span>🖼️</span>
            <strong>{language === 'cn' ? '上传图片' : 'Upload image'}</strong>
            <small>{language === 'cn' ? '从图片推断此刻标签' : 'Infer tags from an image'}</small>
          </button>
        </div>

        {activeMomentAction === 'scene' && (
          <div className="moment-action-panel">
            <div className="scene-grid">
              {scenes.map((scene) => (
                <button className={presentMoment.scene === scene.id ? 'selected' : ''} key={scene.id} type="button" onClick={() => applyMoment(scene.id)}>
                  {scene.icon} {language === 'cn' ? scene.cn : scene.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMomentAction === 'text' && (
          <div className="moment-action-panel">
            <textarea
              className="moment-input"
              value={momentText}
              onChange={(event) => setMomentText(event.target.value)}
              placeholder={language === 'cn' ? '此刻你们在哪里？刚刚发生了什么？' : 'Where are you now? What just happened?'}
              aria-label={language === 'cn' ? '此刻信息' : 'Present moment note'}
            />
            <button className="primary-btn" disabled={!momentText.trim()} type="button" onClick={applyTextMoment}>
              {language === 'cn' ? '应用这句话' : 'Apply this note'}
            </button>
          </div>
        )}

        {activeMomentAction === 'image' && (
          <div className="moment-action-panel">
            <label className="moment-upload">
              <span>{language === 'cn' ? '上传此刻图片' : 'Upload moment image'}</span>
              <input accept="image/*" type="file" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
            </label>
          </div>
        )}

        {presentMoment.imagePreview && (
          <div className="moment-preview">
            <img alt={language === 'cn' ? '此刻图片预览' : 'Moment preview'} src={presentMoment.imagePreview} />
            <div>
              <strong>{presentMoment.image}</strong>
              <p>{presentMoment.imageTags.map((tag) => `#${tag}`).join(' ')}</p>
            </div>
          </div>
        )}
        {presentMoment.routeInfluence && (
          <p className="moment-effect">{presentMoment.routeInfluence.reason}</p>
        )}
        {appliedHint && (
          <p className="moment-applied-hint">{appliedHint}</p>
        )}
      </section>

      <div className="flow-actions">
        <button type="button" onClick={previousStep}>{language === 'cn' ? '返回' : 'Back'}</button>
        <button className="primary-btn" type="button" onClick={startJourney}>{language === 'cn' ? '开始旅程' : 'Begin Journey'}</button>
      </div>
    </main>
  );
}
