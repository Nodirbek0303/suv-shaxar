import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
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
import { api, downloadReport } from '../lib/api';
import { formatDateTime } from '../lib/utils';

export default function SummaryPage() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<any[]>([]);
  const [regionId, setRegionId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void api('/monitoring/regions').then(setRegions);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      sort: 'code',
    });
    if (regionId) params.set('regionId', regionId);
    if (q) params.set('q', q);
    void api(`/monitoring/lines?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [regionId, q, page]);

  async function onExport(format: 'excel' | 'pdf') {
    setExporting(true);
    try {
      await downloadReport(format, regionId || undefined);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t.pages.summaryTitle}
        description={t.pages.summaryDesc}
        actions={
          <>
            <Button
              variant="outline"
              disabled={exporting}
              onClick={() => void onExport('excel')}
            >
              <Download size={16} /> Excel
            </Button>
            <Button disabled={exporting} onClick={() => void onExport('pdf')}>
              <Download size={16} /> PDF
            </Button>
          </>
        }
      />

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

      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : !data?.items?.length ? (
          <Empty text={t.noData} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t.table.code}</th>
                    <th className="text-left px-4 py-3 font-medium">{t.table.region}</th>
                    <th className="text-left px-4 py-3 font-medium">{t.table.length}</th>
                    <th className="text-left px-4 py-3 font-medium">{t.table.avgUsage}</th>
                    <th className="text-left px-4 py-3 font-medium">{t.table.savedPct}</th>
                    <th className="text-left px-4 py-3 font-medium">{t.table.health}</th>
                    <th className="text-left px-4 py-3 font-medium">{t.table.updated}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono text-primary font-medium">{row.code}</td>
                      <td className="px-4 py-3">{row.regionName}</td>
                      <td className="px-4 py-3 tabular">{row.lengthMeters}</td>
                      <td className="px-4 py-3 tabular">{row.avgWaterUsedM3.toFixed(2)}</td>
                      <td className="px-4 py-3 tabular">{row.waterSavedPercent}%</td>
                      <td className="px-4 py-3">
                        <HealthBadge level={row.plantHealthLevel} score={row.plantHealthScore} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDateTime(row.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>
                {t.page} {data.page} {t.of} {Math.max(1, Math.ceil(data.total / data.limit))}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
