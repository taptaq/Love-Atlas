import { useState } from 'react';
import { useUiStore } from '../../store';

type Rating = 'helpful' | 'neutral' | 'not_helpful';

const FEEDBACK_KEY = 'loveAtlasFeedback';

interface FeedbackEntry {
  timestamp: string;
  rating: Rating;
}

export function loadFeedback(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFeedback(rating: Rating): void {
  try {
    const entries = loadFeedback();
    entries.push({ timestamp: new Date().toISOString(), rating });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries.slice(-100)));
  } catch {}
}

export function ExplorationFeedback() {
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';
  const [rating, setRating] = useState<Rating | null>(null);

  const handleRate = (value: Rating) => {
    setRating(value);
    saveFeedback(value);
  };

  if (rating) {
    return (
      <section className="route-preview-card feedback-card">
        <span className="eyebrow">{cn ? '探索反馈' : 'Exploration Feedback'}</span>
        <p className="feedback-thanks">
          {cn ? '谢谢你的反馈，这会帮助你们下次对话更有深度。' : 'Thanks for your feedback — it helps your next conversation go deeper.'}
        </p>
      </section>
    );
  }

  const options: Array<{ value: Rating; label: string; emoji: string }> = [
    { value: 'helpful', label: cn ? '更了解对方了' : 'Understood more', emoji: '💡' },
    { value: 'neutral', label: cn ? '感觉一般' : 'It was okay', emoji: '🤔' },
    { value: 'not_helpful', label: cn ? '没太大帮助' : 'Not much help', emoji: '🌱' },
  ];

  return (
    <section className="route-preview-card feedback-card">
      <span className="eyebrow">{cn ? '探索反馈' : 'Exploration Feedback'}</span>
      <h2>{cn ? '这次对话让你更了解对方了吗？' : 'Did this conversation help you understand each other better?'}</h2>
      <div className="feedback-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="feedback-option-btn"
            onClick={() => handleRate(option.value)}
          >
            <span className="feedback-option-emoji">{option.emoji}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
