import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function healthColor(level?: string) {
  switch (level) {
    case 'good':
      return '#22C55E';
    case 'average':
      return '#EAB308';
    case 'poor':
      return '#EF4444';
    default:
      return '#94a3b8';
  }
}

export function formatM3(n: number, digits = 1) {
  return `${n.toFixed(digits)} m³`;
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
