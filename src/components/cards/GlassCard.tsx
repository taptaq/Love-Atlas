import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function GlassCard({ icon, title, description, children, ...props }: GlassCardProps) {
  return (
    <button className="glass-card" type="button" {...props}>
      <div>
        <div className="card-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        {children}
      </div>
      <span className="card-arrow">→</span>
    </button>
  );
}
