const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function getTokens() {
  return {
    access: localStorage.getItem('accessToken'),
    refresh: localStorage.getItem('refreshToken'),
  };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function setUser(user: unknown) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser<T = any>(): T | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    clearTokens();
    return null;
  }
}

async function refreshAccess(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  let { access } = getTokens();
  if (access) headers.set('Authorization', `Bearer ${access}`);

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    access = await refreshAccess();
    if (access) {
      headers.set('Authorization', `Bearer ${access}`);
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'So‘rov xatosi');
  }

  return res.json();
}

export async function downloadReport(
  format: 'excel' | 'pdf',
  regionId?: string,
) {
  const { access } = getTokens();
  const qs = regionId ? `?regionId=${regionId}` : '';
  const res = await fetch(`${API_URL}/reports/${format}${qs}`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!res.ok) throw new Error('Eksport amalga oshmadi');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    format === 'excel' ? 'sugorish-hisobot.xlsx' : 'sugorish-hisobot.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
