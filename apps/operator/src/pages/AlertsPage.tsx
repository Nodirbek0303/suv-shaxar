import { useEffect, useState } from 'react';
import {
  Card,
  Empty,
  HealthBadge,
  Loading,
  PageHeader,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { formatTime } from '../lib/utils';

export default function AlertsPage() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api('/ops/alerts')
      .then(setAlerts)
      .finally(() => setLoading(false));

    const id = setInterval(() => {
      void api('/ops/alerts').then(setAlerts);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.alertsTitle}
        description={t.pages.alertsDesc}
      />

      <Card className="overflow-hidden">
        {!alerts.length ? (
          <Empty />
        ) : (
          <div className="divide-y divide-emerald-50">
            {alerts.map((a) => (
              <div key={a.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <HealthBadge
                      health={
                        a.severity === 'danger'
                          ? 'danger'
                          : a.severity === 'warning'
                            ? 'warning'
                            : 'normal'
                      }
                    />
                    {a.lineCode && (
                      <span className="font-mono text-primary text-sm">{a.lineCode}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 mt-1">{a.message}</div>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {formatTime(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
