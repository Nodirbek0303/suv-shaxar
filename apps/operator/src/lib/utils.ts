import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function healthColor(health?: string) {
  switch (health) {
    case 'irrigating':
      return '#0EA5E9';
    case 'warning':
      return '#F59E0B';
    case 'danger':
      return '#EF4444';
    default:
      return '#15803D';
  }
}

export function formatTime(d?: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}
