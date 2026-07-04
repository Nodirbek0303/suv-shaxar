import { useEffect, useState } from 'react';
import {
  AnimatedNumber,
  Card,
  KpiCard,
  Loading,
  PageHeader,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';

export default function ReportsPage() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api('/ops/overview'), api('/ops/map-lines')])
      .then(([o, l]) => {
        setOverview(o);
        setLines(l);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const byHealth = {
    normal: lines.filter((l) => l.health === 'normal').length,
    irrigating: lines.filter((l) => l.health === 'irrigating').length,
    warning: lines.filter((l) => l.health === 'warning').length,
    danger: lines.filter((l) => l.health === 'danger').length,
  };

  return (
    <div>
      <PageHeader
        title={t.pages.reportsTitle}
        description={t.pages.reportsDesc}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={t.kpi.activeLines}
          value={<AnimatedNumber value={overview?.activeLines ?? 0} />}
        />
        <KpiCard
          label={t.kpi.savedToday}
          value={
            <>
              <AnimatedNumber value={overview?.todaySavedM3 ?? 0} decimals={1} /> m³
            </>
          }
        />
        <KpiCard
          label={t.kpi.moisture}
          value={
            <>
              <AnimatedNumber value={overview?.avgSoilMoisture ?? 0} decimals={1} />%
            </>
          }
        />
        <KpiCard
          label={t.kpi.faulty}
          value={<AnimatedNumber value={overview?.faultySensors ?? 0} />}
          accent="danger"
        />
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-4">Liniyalar holati taqsimoti</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(byHealth).map(([k, v]) => (
            <div key={k} className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{v}</div>
              <div className="text-xs text-slate-500 mt-1">
                {(t.health as any)[k] || k}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
