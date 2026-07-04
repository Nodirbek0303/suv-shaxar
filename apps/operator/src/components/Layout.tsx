import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  Droplets,
  FileSpreadsheet,
  LayoutDashboard,
  Map,
  Menu,
  Route,
  Users,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { api, clearTokens, getUser } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui';

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const user = getUser<{ fullName: string; role: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState('ok');

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    void api('/ops/overview')
      .then((o) => setSystemStatus(o.systemStatus || 'ok'))
      .catch(() => setSystemStatus('warning'));
  }, []);

  const links = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard, end: true },
    { to: '/map', label: t.nav.map, icon: Map },
    { to: '/lines', label: t.nav.lines, icon: Route },
    { to: '/programs', label: t.nav.programs, icon: Droplets },
    { to: '/sensors', label: t.nav.sensors, icon: Activity },
    { to: '/reports', label: t.nav.reports, icon: FileSpreadsheet },
    { to: '/alerts', label: t.nav.alerts, icon: Bell },
  ];

  if (user?.role === 'obodonlashtirish_admin') {
    links.push({ to: '/users', label: t.nav.users, icon: Users });
  }

  const statusLabel =
    systemStatus === 'ok'
      ? t.status.ok
      : systemStatus === 'danger'
        ? t.status.danger
        : t.status.warning;
  const statusColor =
    systemStatus === 'ok'
      ? 'bg-secondary'
      : systemStatus === 'danger'
        ? 'bg-danger'
        : 'bg-warning';

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-white/10">
        <img
          src="/logo-obodon.png"
          alt="Obodonlashtirish"
          className="h-14 w-14 object-contain bg-white rounded-full p-0.5 mb-3"
        />
        <div className="text-[10px] uppercase tracking-widest text-emerald-200/80">
          {t.orgName}
        </div>
        <div className="font-semibold text-white text-sm mt-0.5">{t.appName}</div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition border-l-2',
                isActive
                  ? 'bg-white/15 text-white border-secondary font-medium'
                  : 'text-white/75 hover:bg-white/10 hover:text-white border-transparent',
              )
            }
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-sm">
        <div className="text-white font-medium">{user?.fullName}</div>
        <div className="text-white/50 text-xs mt-0.5">{user?.role}</div>
        <button
          className="mt-3 text-xs text-emerald-200 hover:text-white"
          onClick={() => {
            clearTokens();
            navigate('/login');
          }}
        >
          {t.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="hidden lg:flex w-64 bg-primary-900 text-white flex-col shrink-0">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-primary-900 text-white">
            <button className="absolute right-3 top-3 text-white/70" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-emerald-100 sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 rounded-lg hover:bg-emerald-50" onClick={() => setOpen(true)}>
                <Menu size={20} />
              </button>
              <img
                src="/logo-obodon.png"
                alt="Obodonlashtirish"
                className="h-10 w-10 object-contain rounded-full bg-white hidden sm:block"
              />
              <div className="hidden md:block">
                <div className="text-xs text-slate-400">{t.appSubtitle}</div>
                <div className="text-sm font-semibold text-primary">{t.orgName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                <span className={cn('w-2 h-2 rounded-full animate-pulse', statusColor)} />
                <span className="text-slate-600">{statusLabel}</span>
              </div>
              <div className="text-xs tabular text-slate-500 font-medium">
                {clock.toLocaleTimeString('uz-UZ')}
              </div>
              <div className="flex rounded-lg border border-emerald-200 overflow-hidden text-xs font-medium">
                <button
                  className={cn('px-2.5 py-1.5', lang === 'uz' ? 'bg-primary text-white' : 'bg-white text-slate-600')}
                  onClick={() => setLang('uz')}
                >
                  UZ
                </button>
                <button
                  className={cn('px-2.5 py-1.5', lang === 'ru' ? 'bg-primary text-white' : 'bg-white text-slate-600')}
                  onClick={() => setLang('ru')}
                >
                  RU
                </button>
              </div>
              <Button
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={() => {
                  clearTokens();
                  navigate('/login');
                }}
              >
                {t.logout}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
