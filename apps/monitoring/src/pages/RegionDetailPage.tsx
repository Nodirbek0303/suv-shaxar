import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaTrendChart } from '../components/Charts';
import {
  Card,
  HealthBadge,
  KpiCard,
  AnimatedNumber,
  Loading,
  PageHeader,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';

export default function RegionDetailPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void api(`/monitoring/regions/${id}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return null;

  const r = data.region;

  return (
    <div>
      <div className="mb-2">
        <Link to="/regions" className="text-sm text-primary hover:underline">
          ← {t.nav.regions}
        </Link>
      </div>
      <PageHeader
        title={r.name}
        description={t.pages.regionsDesc}
        actions={<HealthBadge level={r.plantHealthLevel} score={r.plantHealthScore} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={t.table.lines}
          value={<AnimatedNumber value={r.lineCount} />}
        />
        <KpiCard
          label={t.table.usage}
          value={<><AnimatedNumber value={r.waterUsedM3} decimals={1} /> m³</>}
          accent="secondary"
        />
        <KpiCard
          label={t.table.saved}
          value={<><AnimatedNumber value={r.waterSavedM3} decimals={1} /> m³</>}
          accent="success"
        />
        <KpiCard
          label={t.table.savedPct}
          value={<><AnimatedNumber value={r.waterSavedPercent} decimals={1} />%</>}
          accent="warning"
        />
      </div>

      <div className="mb-6">
        <AreaTrendChart data={data.trends} />
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm">
          {t.nav.lines}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">{t.table.code}</th>
                <th className="text-left px-4 py-3">{t.table.length}</th>
                <th className="text-left px-4 py-3">{t.table.savedPct}</th>
                <th className="text-left px-4 py-3">{t.table.health}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.lines.map((line: any) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 font-mono text-primary">{line.code}</td>
                  <td className="px-4 py-3">{line.lengthMeters}</td>
                  <td className="px-4 py-3">{line.waterSavedPercent}%</td>
                  <td className="px-4 py-3">
                    <HealthBadge level={line.plantHealthLevel} score={line.plantHealthScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
