import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { cn, healthColor } from '../lib/utils';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-card',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  return (
    <motion.span className="tabular" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} key={value}>
      <CountUp value={value} decimals={decimals} />
      {suffix}
    </motion.span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent = 'primary',
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: 'primary' | 'secondary' | 'success' | 'warning';
  icon?: ReactNode;
}) {
  const accents = {
    primary: 'border-l-primary',
    secondary: 'border-l-secondary',
    success: 'border-l-success',
    warning: 'border-l-warning',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-card p-5 border-l-4',
        accents[accent],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-slate-500 font-medium">{label}</div>
        {icon && <div className="text-primary/70">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-slate-900 mt-2 tabular">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1.5">{sub}</div>}
    </motion.div>
  );
}

export function HealthBadge({ level, score }: { level: string; score?: number }) {
  const { t } = useI18n();
  const label =
    level === 'good'
      ? t.health.good
      : level === 'average'
        ? t.health.average
        : t.health.poor;
  const color = healthColor(level);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: `${color}18`, color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
      {score != null && <span className="opacity-80">({score})</span>}
    </span>
  );
}

export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-600',
    secondary: 'bg-secondary text-white hover:bg-secondary-600',
    outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 w-full',
        className,
      )}
    />
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-slate-400">{text}</div>;
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
      {t.loading}
    </div>
  );
}
