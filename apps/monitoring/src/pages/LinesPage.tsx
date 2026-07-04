import { useEffect, useState } from 'react';
import { AreaTrendChart } from '../components/Charts';
import {
  Button,
  Card,
  Empty,
  HealthBadge,
  Input,
  Loading,
  PageHeader,
  Select,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/utils';

export default function LinesPage() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<any[]>([]);
  const [regionId, setRegionId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api('/monitoring/regions').then(setRegions);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (regionId) params.set('regionId', regionId);
    if (q) params.set('q', q);
    void api(`/monitoring/lines?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [regionId, q, page]);

  async function openDetail(id: string) {
    const d = await api(`/monitoring/lines/${id}`);
    setDetail(d);
  }

  return (
    <div>
      <PageHeader title={t.pages.linesTitle} description={t.pages.linesDesc} />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={regionId} onChange={(v) => { setRegionId(v); setPage(1); }}>
          <option value="">{t.filters.allRegions}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>
        <Input
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder={t.filters.search}
          className="sm:max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-hidden">
          {loading ? (
            <Loading />
          ) : !data?.items?.length ? (
            <Empty text={t.noData} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">{t.table.code}</th>
                    <th className="text-left px-4 py-3">{t.table.region}</th>
                    <th className="text-left px-4 py-3">{t.table.health}</th>
                    <th className="text-right px-4 py-3">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono text-primary font-medium">{row.code}</td>
                      <td className="px-4 py-3">{row.regionName}</td>
                      <td className="px-4 py-3">
                        <HealthBadge level={row.plantHealthLevel} score={row.plantHealthScore} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" onClick={() => void openDetail(row.id)}>
                          {t.detail}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4">
          {!detail ? (
            <p className="text-sm text-slate-400 py-8 text-center">{t.detail}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-primary font-semibold text-lg">{detail.code}</div>
                  <div className="text-sm text-slate-500">{detail.regionName}</div>
                </div>
                <button className="text-slate-400 text-sm" onClick={() => setDetail(null)}>
                  {t.close}
                </button>
              </div>
              <HealthBadge level={detail.plantHealthLevel} score={detail.plantHealthScore} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400 text-xs">{t.table.length}</div>
                  <div className="font-semibold">{detail.lengthMeters} m</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400 text-xs">{t.table.savedPct}</div>
                  <div className="font-semibold">{detail.waterSavedPercent}%</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400 text-xs">{t.table.avgUsage}</div>
                  <div className="font-semibold">{detail.avgWaterUsedM3.toFixed(2)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400 text-xs">{t.table.updated}</div>
                  <div className="font-semibold text-xs">{formatDateTime(detail.updatedAt)}</div>
                </div>
              </div>
              {detail.trends?.length > 0 && (
                <div className="-mx-1">
                  <AreaTrendChart data={detail.trends} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
