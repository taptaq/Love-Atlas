import { useState } from 'react';
import { useUiStore } from '../../store';

interface SpaceOnboardingProps {
  spaceId: string;
  role: string;
  spaceType: 'temporary' | 'persistent';
}

const ONBOARDING_KEY_PREFIX = 'loveAtlasOnboarded_';

export function isSpaceOnboarded(spaceId: string): boolean {
  try {
    return localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${spaceId}`) === '1';
  } catch {
    return false;
  }
}

function markSpaceOnboarded(spaceId: string): void {
  try {
    localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${spaceId}`, '1');
  } catch {}
}

export function SpaceOnboarding({ spaceId, role, spaceType }: SpaceOnboardingProps) {
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';
  const [step, setStep] = useState(0);
  const [expectation, setExpectation] = useState('');

  if (isSpaceOnboarded(spaceId)) return null;

  const isOwner = role === 'owner';
  const isPersistent = spaceType === 'persistent';

  const handleFinish = () => {
    markSpaceOnboarded(spaceId);
    setStep(2);
  };

  if (step === 2) return null;

  const steps = isOwner
    ? [
        {
          title: cn ? '你发起了这次对话空间' : 'You started this space',
          body: cn
            ? `你是${isPersistent ? '专属关系空间' : '临时探索空间'}的发起者。把邀请码发给对方，对方加入后你们就可以开始深度对话了。`
            : `You are the initiator of this ${isPersistent ? 'private' : 'temporary'} space. Share the invite code with your partner — once they join, you can start a deep conversation.`,
        },
        {
          title: cn ? '你希望从这次对话中获得什么？' : 'What do you hope to get from this conversation?',
          body: '',
          input: true,
        },
      ]
    : [
        {
          title: cn ? '你已加入对方的对话空间' : 'You joined this space',
          body: cn
            ? '对方已经创建好了空间，你们可以一起开始深度对话。每答完一题，双方回答会同时揭晓。'
            : 'Your partner created this space. You can start a deep conversation together. After each question, both answers will be revealed simultaneously.',
        },
        {
          title: cn ? '你希望从这次对话中获得什么？' : 'What do you hope to get from this conversation?',
          body: '',
          input: true,
        },
      ];

  const current = steps[step];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label={cn ? '空间引导' : 'Space onboarding'}>
      <div className="onboarding-modal">
        <h2>{current.title}</h2>
        {current.body && <p>{current.body}</p>}
        {current.input && (
          <div className="onboarding-input-group">
            <textarea
              className="onboarding-input"
              value={expectation}
              onChange={(e) => setExpectation(e.target.value)}
              placeholder={cn ? '比如：想更了解对方的想法、想聊聊我们之间的话题、想试试深度沟通…' : 'e.g. understand their perspective, talk about us, try deep communication…'}
              rows={3}
              aria-label={cn ? '你的期望' : 'Your expectation'}
            />
          </div>
        )}
        <div className="onboarding-actions">
          {step > 0 && (
            <button type="button" className="onboarding-back-btn" onClick={() => setStep(step - 1)}>
              {cn ? '上一步' : 'Back'}
            </button>
          )}
          <button type="button" className="onboarding-next-btn" onClick={step === steps.length - 1 ? handleFinish : () => setStep(step + 1)}>
            {step === steps.length - 1 ? (cn ? '准备好了，开始' : 'Ready, start') : (cn ? '下一步' : 'Next')}
          </button>
        </div>
        <button type="button" className="onboarding-skip" onClick={handleFinish} aria-label={cn ? '跳过引导' : 'Skip onboarding'}>
          {cn ? '跳过' : 'Skip'}
        </button>
      </div>
    </div>
  );
}
