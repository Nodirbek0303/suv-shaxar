import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  Button,
  Card,
  PageHeader,
  Select,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api, downloadReport } from '../lib/api';

export default function ReportsPage() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<any[]>([]);
  const [regionId, setRegionId] = useState('');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [history, setHistory] = useState<
    { format: string; at: string; region: string }[]
  >([]);

  useEffect(() => {
    void api('/monitoring/regions').then(setRegions);
  }, []);

  async function onExport(format: 'excel' | 'pdf') {
    setExporting(format);
    try {
      await downloadReport(format, regionId || undefined);
      const regionName =
        regions.find((r) => r.id === regionId)?.name || t.filters.allRegions;
      setHistory((h) => [
        {
          format: format.toUpperCase(),
          at: new Date().toLocaleString(),
          region: regionName,
        },
        ...h,
      ].slice(0, 10));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t.pages.reportsTitle}
        description={t.pages.reportsDesc}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <div>
            <div className="text-sm font-semibold text-slate-800">{t.filters.region}</div>
            <Select
              value={regionId}
              onChange={setRegionId}
              className="mt-2 w-full"
            >
              <option value="">{t.filters.allRegions}</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <p className="text-xs text-slate-400 mt-2">{t.export.periodNote}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => void onExport('pdf')}
              disabled={!!exporting}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition"
            >
              <FileText className="text-primary" size={32} />
              <span className="font-medium text-sm">
                {exporting === 'pdf' ? t.export.exporting : t.export.pdf}
              </span>
            </button>
            <button
              onClick={() => void onExport('excel')}
              disabled={!!exporting}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-secondary/20 hover:border-secondary hover:bg-secondary/5 transition"
            >
              <FileSpreadsheet className="text-secondary" size={32} />
              <span className="font-medium text-sm">
                {exporting === 'excel' ? t.export.exporting : t.export.excel}
              </span>
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              disabled={!!exporting}
              onClick={() => void onExport('pdf')}
            >
              <Download size={16} /> PDF
            </Button>
            <Button
              variant="outline"
              disabled={!!exporting}
              onClick={() => void onExport('excel')}
            >
              <Download size={16} /> Excel
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm">
            {t.nav.reports}
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">{t.noData}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((h, i) => (
                <div key={i} className="px-4 py-3 text-sm flex justify-between gap-2">
                  <span className="font-medium text-primary">{h.format}</span>
                  <span className="text-slate-500">{h.region}</span>
                  <span className="text-slate-400 text-xs">{h.at}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
