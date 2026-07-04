import { useEffect, useState } from 'react';
import { PlantDonut } from '../components/Charts';
import ProvinceMap from '../components/ProvinceMap';
import {
  AnimatedNumber,
  Card,
  HealthBadge,
  KpiCard,
  Loading,
  PageHeader,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { healthColor } from '../lib/utils';

export default function PlantHealthPage() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api('/monitoring/plant-health')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title={t.pages.plantsTitle} description={t.pages.plantsDesc} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label={t.kpi.plantHealth}
          value={
            <span className="flex items-center gap-2 flex-wrap">
              <AnimatedNumber value={data.score} decimals={1} />
              <HealthBadge level={data.level} />
            </span>
          }
          accent="success"
        />
        <KpiCard
          label={t.health.good}
          value={<><AnimatedNumber value={data.distribution.good} decimals={1} />%</>}
          sub={`${data.distribution.goodCount} ${t.filters.region.toLowerCase()}`}
          accent="success"
        />
        <KpiCard
          label={t.health.poor}
          value={<><AnimatedNumber value={data.distribution.poor} decimals={1} />%</>}
          sub={`${data.distribution.poorCount} ${t.filters.region.toLowerCase()}`}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <ProvinceMap regions={data.regions} />
        </div>
        <PlantDonut distribution={data.distribution} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList title={t.best} items={data.best} />
        <RankList title={t.worst} items={data.worst} />
      </div>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: any[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm">{title}</div>
      <div className="divide-y divide-slate-100">
        {items.map((r, i) => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: healthColor(r.plantHealthLevel) }}
              />
              <span>
                <span className="text-slate-400 mr-2">{i + 1}.</span>
                {r.name}
              </span>
            </div>
            <HealthBadge level={r.plantHealthLevel} score={r.plantHealthScore} />
          </div>
        ))}
      </div>
    </Card>
  );
}
