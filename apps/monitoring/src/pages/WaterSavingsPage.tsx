import { useEffect, useState } from 'react';
import { AreaTrendChart } from '../components/Charts';
import {
  AnimatedNumber,
  Card,
  HealthBadge,
  KpiCard,
  Loading,
  PageHeader,
  Select,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';

export default function WaterSavingsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState('daily');
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api('/monitoring/regions').then(setRegions);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (regionId) params.set('regionId', regionId);
    void api(`/monitoring/water-savings?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [period, regionId]);

  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.waterTitle}
        description={t.pages.waterDesc}
        actions={
          <>
            <Select value={regionId} onChange={setRegionId}>
              <option value="">{t.filters.allRegions}</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <Select value={period} onChange={setPeriod}>
              <option value="daily">{t.filters.daily}</option>
              <option value="weekly">{t.filters.weekly}</option>
              <option value="monthly">{t.filters.monthly}</option>
              <option value="yearly">{t.filters.yearly}</option>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label={t.kpi.savedWater}
          value={<><AnimatedNumber value={data?.totalSavedM3 ?? 0} decimals={1} /> m³</>}
          accent="success"
        />
        <KpiCard
          label={t.table.usage}
          value={<><AnimatedNumber value={data?.totalUsedM3 ?? 0} decimals={1} /> m³</>}
          accent="secondary"
        />
        <KpiCard
          label={t.table.savedPct}
          value={<><AnimatedNumber value={data?.savedPercent ?? 0} decimals={1} />%</>}
          sub={t.kpi.vsTraditional}
          accent="primary"
        />
      </div>

      <div className="mb-6">
        <AreaTrendChart data={data?.trends ?? []} />
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm">
          {t.charts.regionSavings}
        </div>
        <div className="divide-y divide-slate-100">
          {(data?.ranking ?? []).map((r: any, i: number) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-medium">{r.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular font-semibold text-success">
                  {r.waterSavedM3.toFixed(1)} m³
                </span>
                <span className="tabular text-slate-500">{r.waterSavedPercent}%</span>
                <HealthBadge level={r.plantHealthLevel} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
