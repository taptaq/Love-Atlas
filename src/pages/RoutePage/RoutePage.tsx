import { useEffect, useRef, useState } from 'react';
import { analyzeMomentImageWithCloud } from '../../features/presentMoment/cloudVisionService';
import { generateAiRoute } from '../../features/relationship/aiRouteService';
import { mapAreaConfig } from '../../features/map/map.config';
import { getMomentInfluence, inferImageTags } from '../../features/presentMoment/presentMomentEngine';
import { recognizeMomentImageText } from '../../features/presentMoment/localOcrService';
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

const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function isHeicFile(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function convertHeicToJpeg(file: File) {
  if (!isHeicFile(file)) return file;
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const baseName = file.name.replace(/\.(heic|heif)$/i, '') || 'moment-image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function RoutePage() {
  const language = useUiStore((state) => state.language);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const goal = useJourneyStore((state) => state.goal);
  const route = useJourneyStore((state) => state.route);
  const setRoute = useJourneyStore((state) => state.setRoute);
  const presentMoment = useJourneyStore((state) => state.presentMoment);
  const sessionId = useSessionStore((state) => state.session?.id);
  const sessionRole = useSessionStore((state) => state.role);
  const applyPresentMoment = useJourneyStore((state) => state.applyPresentMoment);
  const startJourney = useJourneyStore((state) => state.startJourney);
  const isStartingJourney = useJourneyStore((state) => state.isStartingJourney);
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
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const stage = getStageOption(relationshipStage);
  const goalOption = getGoalOption(goal);
  const cn = language === 'cn';
  // 主导方模型：host 负责生成 AI 路线和开始旅程，partner 完全跟随
  const isFollower = sessionRole === 'partner';

  // AI 生成路线：只有 host 触发生成，partner 等待同步过来的 AI 路线
  // 避免双方各自生成不同路线后互相覆盖（DeepSeek temperature 0.7 会产生不同结果）
  // partner 进入时：如果 store.route 已经是 AI 生成，直接使用，不调 API
  useEffect(() => {
    // partner 模式：如果 store 里已经有 host 生成的 AI 路线，直接采用，不重新生成
    if (sessionRole === 'partner' && route.generatedBy === 'ai' && route.areas.length > 0) {
      setAiRouteAreas(route.areas);
      setAiRouteReason(typeof route.reason === 'string' ? route.reason : route.reason?.cn ?? '');
      setAiFallback(false);
      setAiLoading(false);
      return;
    }
    // partner 模式且 host 还没生成路线：显示等待状态，不调 API
    if (sessionRole === 'partner') {
      setAiLoading(true);
      return;
    }
    // host 模式：触发生成（如果还没生成过）
    if (route.generatedBy === 'ai' && route.areas.length > 0) {
      setAiRouteAreas(route.areas);
      setAiRouteReason(typeof route.reason === 'string' ? route.reason : route.reason?.cn ?? '');
      setAiFallback(false);
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    generateAiRoute({ stage: relationshipStage, goal, language })
      .then((result) => {
        if (cancelled) return;
        setAiRouteAreas(result.areas);
        setAiRouteReason(result.reason);
        setAiFallback(false);
        // 关键：把 AI 路线写入 store，否则 endJourney 的 summary.route 会取到旧的静态路线
        setRoute({ areas: result.areas, reason: result.reason, generatedBy: 'ai' });
      })
      .catch(() => {
        if (cancelled) return;
        // 兜底：使用固定组合
        const fallbackAreas = getRecommendedRouteAreas(relationshipStage, goal);
        setAiRouteAreas(fallbackAreas);
        setAiRouteReason('');
        setAiFallback(true);
        setRoute({ areas: fallbackAreas, reason: '', generatedBy: 'relationship' });
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(appliedHintTimer.current);
    };
  }, [relationshipStage, goal, language, setRoute, sessionRole, route.generatedBy, route.areas, route.reason]);

  // partner 收到 host 同步过来的 AI 路线时，同步更新本地 UI
  useEffect(() => {
    if (sessionRole !== 'partner') return;
    if (route.generatedBy === 'ai' && route.areas.length > 0) {
      setAiRouteAreas(route.areas);
      setAiRouteReason(typeof route.reason === 'string' ? route.reason : route.reason?.cn ?? '');
      setAiFallback(false);
      setAiLoading(false);
    }
  }, [sessionRole, route.generatedBy, route.areas, route.reason]);

  const routeAreas = aiRouteAreas ?? (route.areas.length > 0 ? route.areas : goalOption ? [goalOption.primaryArea] : []);
  const routeReason = aiRouteReason || (typeof route.reason === 'string' ? route.reason : route.reason?.[language]);

  const showAppliedHint = (message: string) => {
    setAppliedHint(message);
    window.clearTimeout(appliedHintTimer.current);
    appliedHintTimer.current = window.setTimeout(() => setAppliedHint(''), 2000);
  };

  const clearMomentHint = () => {
    window.clearTimeout(appliedHintTimer.current);
    setAppliedHint('');
  };

  const applyMoment = (scene: MomentScene) => {
    const combinedMomentText = [momentText, presentMoment.imageOcrText].filter(Boolean).join(' ');
    const routeInfluence = getMomentInfluence(scene, combinedMomentText, presentMoment.imageTags);
    applyPresentMoment({ scene, text: momentText, routeInfluence });
    showAppliedHint(language === 'cn' ? '场景已应用' : 'Scene applied');
  };

  const applyTextMoment = () => {
    if (!momentText.trim()) return;
    const imageTags = presentMoment.image
      ? inferImageTags(presentMoment.image, momentText, presentMoment.imageOcrText)
      : presentMoment.imageTags;
    const combinedMomentText = [momentText, presentMoment.imageOcrText].filter(Boolean).join(' ');
    const routeInfluence = getMomentInfluence(presentMoment.scene, combinedMomentText, imageTags);
    applyPresentMoment({ text: momentText, imageTags, routeInfluence });
    showAppliedHint(language === 'cn' ? '句子已应用' : 'Note applied');
  };

  const skipMoment = () => {
    clearMomentHint();
    setActiveMomentAction('none');
    setMomentText('');
    applyPresentMoment({ scene: '', text: '', image: null, imagePreview: '', imageTags: [], imageCaption: '', imageUnderstandingSource: null, imageOcrText: '', imageOcrConfidence: null, imageOcrStatus: 'idle', captureMode: null, routeInfluence: null });
    showAppliedHint(language === 'cn' ? '已跳过此刻信息' : 'Moment skipped');
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      showAppliedHint(language === 'cn'
        ? `图片不能超过 10MB，当前 ${formatFileSize(file.size)}`
        : `Image must be under 10MB. Current size: ${formatFileSize(file.size)}`);
      return;
    }
    setImageUploading(true);
    let momentFile = file;
    let localPreview = '';
    let imagePreview = '';

    try {
      if (isHeicFile(file)) {
        showAppliedHint(language === 'cn' ? '正在将 HEIC 转为 JPG…' : 'Converting HEIC to JPG...');
      }
      momentFile = await convertHeicToJpeg(file);
      if (momentFile.size > MAX_IMAGE_UPLOAD_BYTES) {
        showAppliedHint(language === 'cn'
          ? `转换后的图片超过 10MB，当前 ${formatFileSize(momentFile.size)}`
          : `Converted image is over 10MB. Current size: ${formatFileSize(momentFile.size)}`);
        setImageUploading(false);
        return;
      }
      localPreview = await readFileAsDataUrl(momentFile);
      imagePreview = localPreview;

      try {
        imagePreview = (await uploadPresentMomentImage(sessionId, momentFile)) ?? localPreview;
      } catch {
        imagePreview = localPreview;
      }
    } catch {
      showAppliedHint(isHeicFile(file)
        ? (language === 'cn' ? '这张 HEIC 暂时无法转换，请导出为 JPG/PNG 后再试' : 'This HEIC image could not be converted. Please export it as JPG/PNG and try again')
        : (language === 'cn' ? '图片读取失败，请换一张图片再试' : 'Image read failed, please try another image'));
      setImageUploading(false);
      return;
    } finally {
      setImageUploading(false);
    }

    const imageTags = inferImageTags(momentFile.name, momentText);
    const routeInfluence = getMomentInfluence(presentMoment.scene, momentText, imageTags);
    applyPresentMoment({
      text: momentText,
      image: momentFile.name,
      imagePreview,
      imageTags,
      imageCaption: '',
      imageUnderstandingSource: 'heuristic',
      imageOcrText: '',
      imageOcrConfidence: null,
      imageOcrStatus: 'recognizing',
      captureMode: 'upload',
      routeInfluence,
    });
    showAppliedHint(language === 'cn' ? '图片已应用，正在优先调用云端视觉理解' : 'Image applied, cloud vision is analyzing first');

    setImageAnalyzing(true);
    try {
      const cloudResult = await analyzeMomentImageWithCloud({
        imageDataUrl: localPreview,
        fileName: momentFile.name,
        momentText,
        ocrText: '',
        language,
      });
      const isCloudVision = cloudResult.source === 'cloud-vlm';
      applyPresentMoment({
        text: momentText,
        image: momentFile.name,
        imagePreview,
        imageTags: cloudResult.tags ?? [],
        imageCaption: cloudResult.caption,
        imageUnderstandingSource: isCloudVision ? 'cloud-vlm' : 'heuristic',
        imageOcrStatus: 'recognizing',
        captureMode: 'upload',
        routeInfluence: {
          primaryArea: cloudResult.area,
          reason: cloudResult.reason || cloudResult.caption || (language === 'cn' ? '云端视觉模型已根据图片调整路线。' : 'Cloud vision adjusted the route from the image.'),
          weight: 0.84,
        },
      });
      if (isCloudVision) {
        showAppliedHint(language === 'cn' ? '云端视觉理解已应用到路线' : 'Cloud vision applied to route');
      } else {
        // fallback 时展示服务端返回的具体错误，方便用户/开发者定位模型链路问题
        const fallbackReason = cloudResult.error
          ? (language === 'cn' ? `图片场景目前无法解析：${cloudResult.error}` : `Image scene cannot be parsed: ${cloudResult.error}`)
          : (cloudResult.reason || (language === 'cn' ? '图片里没有识别出足够清晰的场景信息，已保留基础图片线索' : 'No clear scene information was recognized, so basic image cues were kept'));
        showAppliedHint(fallbackReason.slice(0, 120));
      }
    } catch {
      // 云端视觉调用失败：明确提示目前无法解析，保留已上传图片的基础线索
      showAppliedHint(language === 'cn' ? '图片场景目前无法解析，已保留基础图片线索' : 'Image scene cannot be parsed right now, basic cues kept');
    } finally {
      setImageAnalyzing(false);
    }

    try {
      const ocr = await recognizeMomentImageText(momentFile);
      const cloudTags = useJourneyStore.getState().presentMoment.imageUnderstandingSource === 'cloud-vlm'
        ? (useJourneyStore.getState().presentMoment.imageTags ?? [])
        : [];
      const ocrTags = Array.from(new Set([...cloudTags, ...inferImageTags(momentFile.name, momentText, ocr.text)]));
      const combinedMomentText = [momentText, ocr.text].filter(Boolean).join(' ');
      const currentMoment = useJourneyStore.getState().presentMoment;
      const shouldKeepVisionFallback = Boolean(currentMoment.routeInfluence?.reason) && !ocr.text;
      const ocrRouteInfluence = currentMoment.imageUnderstandingSource === 'cloud-vlm'
        ? currentMoment.routeInfluence
        : shouldKeepVisionFallback
          ? currentMoment.routeInfluence
        : getMomentInfluence(presentMoment.scene, combinedMomentText, ocrTags);
      applyPresentMoment({
        text: momentText,
        image: momentFile.name,
        imagePreview,
        imageTags: ocrTags,
        imageUnderstandingSource: currentMoment.imageUnderstandingSource === 'cloud-vlm'
          ? 'cloud-vlm'
          : ocr.text
            ? 'local-ocr'
            : currentMoment.imageUnderstandingSource,
        imageOcrText: ocr.text,
        imageOcrConfidence: ocr.confidence,
        imageOcrStatus: 'done',
        captureMode: 'upload',
        routeInfluence: ocrRouteInfluence,
      });
      showAppliedHint(ocr.text
        ? (language === 'cn' ? '图片文字线索已补充到路线' : 'Image text cues added to route')
        : (language === 'cn' ? '图片理解已完成' : 'Image understanding complete'));
    } catch {
      applyPresentMoment({
        imageOcrText: '',
        imageOcrConfidence: null,
        imageOcrStatus: 'error',
      });
      showAppliedHint(language === 'cn' ? '图片文字识别未完成，已保留基础图片标签' : 'Image text recognition unavailable, image tags kept');
    }
  };

  return (
    <main className="page flow-page">
      <LoadingOverlay visible={aiLoading} message={language === 'cn' ? 'AI 正在生成你们今天的路线…' : 'AI is generating today\u2019s route…'} />
      <LoadingOverlay visible={imageUploading} message={language === 'cn' ? '正在上传图片…' : 'Uploading image…'} />
      <LoadingOverlay visible={imageAnalyzing} message={language === 'cn' ? '正在解析图片场景…' : 'Analyzing image scene…'} />
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
          <button className={activeMomentAction === 'none' ? 'selected' : ''} type="button" disabled={isFollower} onClick={skipMoment}>
            <span>✨</span>
            <strong>{language === 'cn' ? '暂不补充' : 'Skip for now'}</strong>
            <small>{language === 'cn' ? '直接使用当前路线' : 'Use the route as is'}</small>
          </button>
          <button className={activeMomentAction === 'scene' ? 'selected' : ''} type="button" disabled={isFollower} onClick={() => { clearMomentHint(); applyPresentMoment({ imageOcrStatus: 'idle', imageOcrText: '', imageOcrConfidence: null }); setActiveMomentAction('scene'); }}>
            <span>📍</span>
            <strong>{language === 'cn' ? '选择场景' : 'Choose scene'}</strong>
            <small>{language === 'cn' ? '用所在场景修正路线' : 'Shape the route by place'}</small>
          </button>
          <button className={activeMomentAction === 'text' ? 'selected' : ''} type="button" disabled={isFollower} onClick={() => { clearMomentHint(); applyPresentMoment({ imageOcrStatus: 'idle', imageOcrText: '', imageOcrConfidence: null }); setActiveMomentAction('text'); }}>
            <span>✍️</span>
            <strong>{language === 'cn' ? '写一句话' : 'Write a note'}</strong>
            <small>{language === 'cn' ? '记录刚刚发生的事' : 'Capture what just happened'}</small>
          </button>
          <button className={activeMomentAction === 'image' ? 'selected' : ''} type="button" disabled={isFollower} onClick={() => { clearMomentHint(); setActiveMomentAction('image'); }}>
            <span>🖼️</span>
            <strong>{language === 'cn' ? '上传图片' : 'Upload image'}</strong>
            <small>{language === 'cn' ? '支持 JPG/PNG/HEIC，10MB 内' : 'JPG, PNG, or HEIC under 10MB'}</small>
          </button>
        </div>

        {activeMomentAction === 'scene' && (
          <div className="moment-action-panel">
            <div className="scene-grid">
              {scenes.map((scene) => (
                <button className={presentMoment.scene === scene.id ? 'selected' : ''} key={scene.id} type="button" disabled={isFollower} onClick={() => applyMoment(scene.id)}>
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
              disabled={isFollower}
              placeholder={language === 'cn' ? '此刻你们在哪里？刚刚发生了什么？' : 'Where are you now? What just happened?'}
              aria-label={language === 'cn' ? '此刻信息' : 'Present moment note'}
            />
            <button className="primary-btn" disabled={isFollower || !momentText.trim()} type="button" onClick={applyTextMoment}>
              {language === 'cn' ? '应用这句话' : 'Apply this note'}
            </button>
          </div>
        )}

        {activeMomentAction === 'image' && (
          <div className="moment-action-panel">
            <label className="moment-upload">
              <span>{language === 'cn' ? '上传此刻图片（≤10MB）' : 'Upload moment image (≤10MB)'}</span>
              <input accept="image/*,.heic,.heif" type="file" disabled={isFollower} onChange={(event) => { void handleImageUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
            </label>
          </div>
        )}

        {presentMoment.imagePreview && (
          <div className="moment-preview">
            <img alt={language === 'cn' ? '此刻图片预览' : 'Moment preview'} src={presentMoment.imagePreview} />
            <div>
              <strong>{presentMoment.image}</strong>
              <p>{(presentMoment.imageTags ?? []).filter((tag) => tag !== 'ocr-text').map((tag) => `#${tag}`).join(' ')}</p>
              {presentMoment.imageUnderstandingSource === 'cloud-vlm' && (
                <p>{language === 'cn' ? '云端视觉理解：' : 'Cloud vision: '}{presentMoment.imageCaption || presentMoment.routeInfluence?.reason}</p>
              )}
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
        {!isFollower && (
          <button type="button" onClick={previousStep}>{language === 'cn' ? '返回' : 'Back'}</button>
        )}
        <button
          className="primary-btn"
          disabled={isFollower || isStartingJourney}
          type="button"
          onClick={() => { void startJourney(); }}
        >
          {isFollower
            ? (aiLoading
                ? (cn ? '等待对方生成路线…' : 'Waiting for route…')
                : (cn ? '等待对方开始…' : 'Waiting for partner…'))
            : isStartingJourney
              ? (cn ? 'AI 出题中…' : 'AI generating…')
              : (cn ? '开始旅程' : 'Begin Journey')}
        </button>
      </div>
    </main>
  );
}
