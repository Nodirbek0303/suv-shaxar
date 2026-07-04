import { useEffect, useState } from 'react';
import { Droplets, Leaf, LineChart, Waves } from 'lucide-react';
import {
  PlantDonut,
  RegionSavingsChart,
  TrendChart,
} from '../components/Charts';
import ProvinceMap from '../components/ProvinceMap';
import {
  AnimatedNumber,
  HealthBadge,
  KpiCard,
  Loading,
  PageHeader,
  Select,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';

export default function DashboardPage() {
  const { t } = useI18n();
  const [regionId, setRegionId] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [plant, setPlant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void api('/monitoring/regions')
      .then(setRegions)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const qs = regionId ? `?regionId=${regionId}` : '';
    const params = new URLSearchParams({ days: '30' });
    if (regionId) params.set('regionId', regionId);

    Promise.all([
      api(`/monitoring/overview${qs}`),
      api(`/monitoring/overview/today${qs}`),
      api(`/monitoring/trends?${params}`),
      api(`/monitoring/plant-health${qs}`),
    ])
      .then(([o, td, tr, ph]) => {
        setOverview(o);
        setToday(td);
        setTrends(tr || []);
        setPlant(ph);
      })
      .catch((e) => setError(e.message || 'Xato'))
      .finally(() => setLoading(false));
  }, [regionId]);

  if (loading && !overview) return <Loading />;

  if (error && !overview) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 text-red-700">
        <div className="font-semibold mb-1">Ma&apos;lumot yuklanmadi</div>
        <div className="text-sm">{error}</div>
        <div className="text-xs text-slate-500 mt-2">
          API ishlayotganini tekshiring: http://localhost:3000/api
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t.pages.dashboardTitle}
        description={t.pages.dashboardDesc}
        actions={
          <Select value={regionId} onChange={setRegionId}>
            <option value="">{t.filters.allRegions}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={t.kpi.totalLines}
          value={<AnimatedNumber value={overview?.totalLines ?? 0} />}
          sub={t.kpi.last30}
          accent="primary"
          icon={<LineChart size={18} />}
        />
        <KpiCard
          label={t.kpi.todayUsage}
          value={
            <>
              <AnimatedNumber value={today?.waterUsedM3 ?? 0} decimals={1} /> m³
            </>
          }
          sub={t.kpi.today}
          accent="secondary"
          icon={<Waves size={18} />}
        />
        <KpiCard
          label={t.kpi.savedWater}
          value={
            <>
              <AnimatedNumber value={overview?.waterSavedM3 ?? 0} decimals={1} /> m³
            </>
          }
          sub={`${overview?.waterSavedPercent ?? 0}% ${t.kpi.vsTraditional}`}
          accent="success"
          icon={<Droplets size={18} />}
        />
        <KpiCard
          label={t.kpi.plantHealth}
          value={
            <span className="flex items-center gap-2 flex-wrap">
              <AnimatedNumber value={overview?.plantHealthScore ?? 0} decimals={1} />
              <HealthBadge level={overview?.plantHealthLevel ?? 'average'} />
            </span>
          }
          sub={t.kpi.last30}
          accent="warning"
          icon={<Leaf size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-2">
          <ProvinceMap
            regions={regions}
            selectedId={regionId}
            onSelect={setRegionId}
          />
        </div>
        <div>
          <PlantDonut distribution={plant?.distribution} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TrendChart data={trends} />
        <RegionSavingsChart regions={regions} />
      </div>
    </div>
  );
}
