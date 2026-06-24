import { useEffect, useState } from 'react';
import { useUiStore, useJourneyStore } from '../../store';
import {
  checkShouldRemindAsync,
  getBrowserPermission,
  getReminderState,
  markReminderDismissed,
  requestBrowserPermission,
  sendBrowserNotification,
  setBrowserNotificationsEnabled,
  setReminderFrequency,
  type ReminderContent,
  type ReminderFrequency,
} from '../../services/notificationService';

const FREQUENCY_OPTIONS: Array<{ value: ReminderFrequency; cn: string; en: string }> = [
  { value: 'off', cn: '关闭', en: 'Off' },
  { value: 'daily', cn: '每天', en: 'Daily' },
  { value: 'every3days', cn: '每 3 天', en: 'Every 3 days' },
  { value: 'weekly', cn: '每周', en: 'Weekly' },
];

export function ReminderBanner() {
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const goal = useJourneyStore((state) => state.goal);
  const journeyHistory = useJourneyStore((state) => state.journeyHistory);
  const [reminder, setReminder] = useState<ReminderContent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frequency, setFrequency] = useState<ReminderFrequency>('off');
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    const state = getReminderState();
    setFrequency(state.frequency);
    setBrowserPerm(getBrowserPermission());
    // 异步获取 AI 个性化提醒
    void checkShouldRemindAsync({
      stage: relationshipStage,
      lastGoal: goal,
      history: journeyHistory.map((item) => item.question.question),
    }).then((content) => {
      if (content) {
        setReminder(content);
        if (state.browserEnabled && browserPerm === 'granted') {
          sendBrowserNotification(content.title, content.body);
        }
      }
    });
  }, [browserPerm, relationshipStage, goal, journeyHistory]);

  const handleDismiss = () => {
    if (reminder) markReminderDismissed(reminder.weekKey);
    setReminder(null);
  };

  const handleStartNow = () => {
    if (reminder) markReminderDismissed(reminder.weekKey);
    setReminder(null);
  };

  const handleFrequencyChange = (value: ReminderFrequency) => {
    setFrequency(value);
    setReminderFrequency(value);
  };

  const handleBrowserToggle = async () => {
    if (browserPerm === 'unsupported') return;
    if (browserPerm !== 'granted') {
      const result = await requestBrowserPermission();
      setBrowserPerm(result);
      if (result === 'granted') {
        setBrowserNotificationsEnabled(true);
      }
    } else {
      const state = getReminderState();
      const next = !state.browserEnabled;
      setBrowserNotificationsEnabled(next);
    }
  };

  const state = getReminderState();
  const browserEnabled = state.browserEnabled && browserPerm === 'granted';

  return (
    <>
      {reminder && (
        <section className="reminder-banner" role="alert" aria-live="polite">
          <div className="reminder-content">
            <span className="reminder-icon" aria-hidden="true">💭</span>
            <div className="reminder-text">
              <strong>{reminder.title}</strong>
              <p>{reminder.body}</p>
            </div>
          </div>
          <div className="reminder-actions">
            <button type="button" className="reminder-start-btn" onClick={handleStartNow}>
              {cn ? '现在聊聊' : 'Talk now'}
            </button>
            <button type="button" className="reminder-dismiss-btn" onClick={handleDismiss} aria-label={cn ? '关闭提醒' : 'Dismiss'}>
              ×
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className="reminder-settings-toggle"
        onClick={() => setSettingsOpen(!settingsOpen)}
        aria-expanded={settingsOpen}
      >
        <span aria-hidden="true">🔔</span>
        <span>{cn ? '提醒设置' : 'Reminders'}</span>
      </button>

      {settingsOpen && (
        <section className="reminder-settings-card" aria-label={cn ? '提醒设置' : 'Reminder Settings'}>
          <h3>{cn ? '温和提醒' : 'Gentle Reminders'}</h3>
          <p className="reminder-settings-desc">
            {cn ? '在你忙碌的时候，轻轻提醒你回来和对方聊聊天。' : 'A gentle nudge to come back and talk with your partner.'}
          </p>

          <div className="reminder-settings-row">
            <label>{cn ? '提醒频率' : 'Frequency'}</label>
            <div className="reminder-freq-options">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={frequency === option.value ? 'reminder-freq-btn reminder-freq-active' : 'reminder-freq-btn'}
                  onClick={() => handleFrequencyChange(option.value)}
                >
                  {cn ? option.cn : option.en}
                </button>
              ))}
            </div>
          </div>

          {browserPerm !== 'unsupported' && (
            <div className="reminder-settings-row">
              <label>{cn ? '浏览器通知' : 'Browser notifications'}</label>
              <button
                type="button"
                className={browserEnabled ? 'reminder-browser-btn reminder-browser-on' : 'reminder-browser-btn'}
                onClick={() => void handleBrowserToggle()}
                disabled={browserPerm === 'denied'}
              >
                {browserPerm === 'denied'
                  ? (cn ? '已被浏览器拒绝' : 'Blocked by browser')
                  : browserEnabled
                    ? (cn ? '已开启 ✓' : 'On ✓')
                    : (cn ? '开启' : 'Enable')}
              </button>
            </div>
          )}

          <button type="button" className="reminder-settings-close" onClick={() => setSettingsOpen(false)}>
            {cn ? '完成' : 'Done'}
          </button>
        </section>
      )}
    </>
  );
}
