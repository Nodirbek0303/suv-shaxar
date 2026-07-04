import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Droplets,
  FileSpreadsheet,
  LayoutDashboard,
  Leaf,
  MapPinned,
  Menu,
  Route,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { clearTokens, getUser } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui';

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const user = getUser<{ fullName: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard, end: true },
    { to: '/summary', label: t.nav.summary, icon: FileSpreadsheet },
    { to: '/regions', label: t.nav.regions, icon: MapPinned },
    { to: '/lines', label: t.nav.lines, icon: Route },
    { to: '/water-savings', label: t.nav.water, icon: Droplets },
    { to: '/plant-health', label: t.nav.plants, icon: Leaf },
    { to: '/reports', label: t.nav.reports, icon: FileSpreadsheet },
  ];

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/logo-uz.png"
            alt="O'zbekiston"
            className="h-12 w-auto object-contain drop-shadow-md bg-white/95 rounded-md px-1 py-0.5"
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-secondary-100/80">
              {t.govName}
            </div>
            <div className="font-semibold text-white text-sm leading-tight mt-0.5">
              {t.appName}
            </div>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-white/50 bg-white/10 rounded-md px-2 py-1 inline-block">
          {t.readonly}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
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
                  ? 'bg-white/10 text-white border-secondary font-medium'
                  : 'text-white/70 hover:bg-white/5 hover:text-white border-transparent',
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
        <div className="text-white/50 text-xs mt-0.5">
          {t.position}: {t.viewer}
        </div>
        <button
          className="mt-3 text-xs text-secondary hover:text-white transition"
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
      <aside className="hidden lg:flex w-64 bg-primary text-white flex-col shrink-0">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-primary text-white">
            <button
              className="absolute right-3 top-3 text-white/70"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setOpen(true)}
              >
                <Menu size={20} />
              </button>
              <img
                src="/logo-uz.png"
                alt="O'zbekiston"
                className="h-9 w-auto object-contain hidden sm:block"
              />
              <div className="hidden sm:block">
                <div className="text-xs text-slate-400">{t.appSubtitle}</div>
                <div className="text-sm font-semibold text-primary">
                  {t.govName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                <button
                  className={cn(
                    'px-2.5 py-1.5',
                    lang === 'uz'
                      ? 'bg-primary text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50',
                  )}
                  onClick={() => setLang('uz')}
                >
                  UZ
                </button>
                <button
                  className={cn(
                    'px-2.5 py-1.5',
                    lang === 'ru'
                      ? 'bg-primary text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50',
                  )}
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
