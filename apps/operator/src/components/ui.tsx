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
        'bg-white rounded-xl border border-emerald-100 shadow-card',
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
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      setDisplay(value * (1 - Math.pow(1 - t, 3)));
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
    <span className="tabular">
      <CountUp value={value} decimals={decimals} />
      {suffix}
    </span>
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
  accent?: 'primary' | 'info' | 'warning' | 'danger';
  icon?: ReactNode;
}) {
  const border = {
    primary: 'border-l-primary',
    info: 'border-l-info',
    warning: 'border-l-warning',
    danger: 'border-l-danger',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-xl border border-emerald-100 shadow-card p-4 border-l-4',
        border[accent],
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="text-sm text-slate-500 font-medium">{label}</div>
        {icon && <div className="text-primary/70">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

export function HealthBadge({ health }: { health: string }) {
  const { t } = useI18n();
  const label =
    (t.health as any)[health] || (t.status as any)[health] || health;
  const color = healthColor(health);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: `${color}18`, color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
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
  variant?: 'primary' | 'danger' | 'outline' | 'info';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-800',
    danger: 'bg-danger text-white hover:bg-red-600',
    info: 'bg-info text-white hover:bg-sky-600',
    outline: 'bg-white border border-emerald-200 text-slate-700 hover:bg-emerald-50',
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
        'border border-emerald-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
        className,
      )}
    >
      {children}
    </select>
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
        'border border-emerald-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full',
        className,
      )}
    />
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
      {t.loading}
    </div>
  );
}

export function Empty({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="py-12 text-center text-sm text-slate-400">
      {text || t.noData}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-lg shadow-lg text-sm">
      {message}
    </div>
  );
}
