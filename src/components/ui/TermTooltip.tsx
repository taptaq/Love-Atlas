import { useState, useRef, useId } from 'react';
import type { ReactNode } from 'react';
import { useUiStore } from '../../store';

interface TermTooltipProps {
  children: ReactNode;
  explanation: { cn: string; en: string };
}

// 术语解释 tooltip：首次使用时帮助用户理解「空间」「探索」「旅程」「世界」等概念
export function TermTooltip({ children, explanation }: TermTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const tooltipId = useId();
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';

  const show = () => {
    window.clearTimeout(timerRef.current);
    setVisible(true);
  };
  const hide = () => {
    timerRef.current = window.setTimeout(() => setVisible(false), 120);
  };

  return (
    <span className="term-tooltip-wrap" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <span className="term-tooltip-term" aria-describedby={visible ? tooltipId : undefined} tabIndex={0}>
        {children}
      </span>
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="term-tooltip-content"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {cn ? explanation.cn : explanation.en}
        </span>
      )}
    </span>
  );
}
