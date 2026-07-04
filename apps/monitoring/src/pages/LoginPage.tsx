import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { api, clearTokens, getUser, setTokens, setUser } from '../lib/api';

export default function LoginPage() {
  const existing = getUser();
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [phone, setPhone] = useState('+998903333333');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (existing) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password, panel: 'monitoring' }),
      });
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Kirish amalga oshmadi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'linear-gradient(135deg, #003087 0%, #00225f 50%, #00AEEF 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 0 }}>
        {(['uz', 'ru'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            style={{
              padding: '6px 12px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: lang === l ? '#fff' : 'transparent',
              color: lang === l ? '#003087' : '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/logo-uz.png"
            alt="O'zbekiston bayrog'i va gerbi"
            style={{
              height: 88,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              margin: '0 auto',
              display: 'block',
            }}
          />
          <div
            style={{
              color: '#00AEEF',
              fontSize: 12,
              fontWeight: 600,
              marginTop: 12,
              textTransform: 'uppercase',
            }}
          >
            {t.govName}
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: 24, color: '#0f172a' }}>
            {t.loginTitle}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>{t.loginHint}</p>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 14,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 14, color: '#475569' }}>{t.phone}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: '100%',
              marginTop: 4,
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 18 }}>
          <span style={{ fontSize: 14, color: '#475569' }}>{t.password}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              marginTop: 4,
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: '#003087',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? t.loggingIn : t.login}
        </button>

        <button
          type="button"
          onClick={() => {
            clearTokens();
            window.location.reload();
          }}
          style={{
            width: '100%',
            marginTop: 10,
            padding: 10,
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Sessiyani tozalash
        </button>

        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 14 }}>
          {t.demo}
        </p>
        <a
          href="http://localhost:5170"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 12,
            fontSize: 13,
            color: '#003087',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Portalga qaytish
        </a>
      </form>
    </div>
  );
}
