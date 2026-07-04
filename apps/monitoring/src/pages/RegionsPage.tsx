import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ComparisonChart } from '../components/Charts';
import { HealthBadge, Loading, PageHeader } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { healthColor } from '../lib/utils';

export default function RegionsPage() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api('/monitoring/regions')
      .then(setRegions)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.regionsTitle}
        description={t.pages.regionsDesc}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {regions.map((r) => (
          <Link
            key={r.id}
            to={`/regions/${r.id}`}
            className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 hover:shadow-md transition block"
            style={{ borderLeft: `4px solid ${healthColor(r.plantHealthLevel)}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{r.name}</h3>
              <HealthBadge level={r.plantHealthLevel} score={r.plantHealthScore} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div>
                <div className="text-slate-400 text-xs">{t.table.lines}</div>
                <div className="font-semibold text-lg tabular">{r.lineCount}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">{t.table.savedPct}</div>
                <div className="font-semibold text-lg tabular text-secondary">
                  {r.waterSavedPercent}%
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">{t.table.usage}</div>
                <div className="font-medium tabular">{r.waterUsedM3.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">{t.table.saved}</div>
                <div className="font-medium tabular text-success">
                  {r.waterSavedM3.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-primary font-medium">{t.detail} →</div>
          </Link>
        ))}
      </div>

      <ComparisonChart regions={regions} />
    </div>
  );
}
