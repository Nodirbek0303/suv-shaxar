import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Button,
  Card,
  Empty,
  HealthBadge,
  Loading,
  PageHeader,
  Select,
  Toast,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { healthColor } from '../lib/utils';

export default function MapPage() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [regionId, setRegionId] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  async function loadLines(rid?: string) {
    const all = await api('/ops/map-lines');
    setLines(rid ? all.filter((l: any) => l.regionId === rid) : all);
  }

  useEffect(() => {
    void api('/regions').then((r) =>
      setRegions(r.filter((x: any) => x.level === 'tuman' || x.level === 'shahar')),
    );
    void loadLines().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadLines(regionId || undefined);
  }, [regionId]);

  async function openLine(line: any) {
    const detail = await api(`/lines/${line.id}`);
    setSelected(detail);
    const hist = await api(`/lines/${line.id}/history?hours=24`);
    setHistory(hist || []);
  }

  async function toggleIrrigation() {
    if (!selected) return;
    const updated = await api(`/lines/${selected.id}/irrigation`, {
      method: 'POST',
      body: JSON.stringify({
        irrigationOn: !selected.irrigationOn,
        irrigationMode: 'manual',
      }),
    });
    setSelected(updated);
    setToast(updated.irrigationOn ? t.actions.turnOn : t.actions.turnOff);
    void loadLines(regionId || undefined);
  }

  const moistureHistory = history
    .filter((h) => h.sensor_type === 'soil_moisture')
    .map((h) => ({
      time: new Date(h.recorded_at).toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: h.value,
    }));

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.mapTitle}
        description={t.pages.mapDesc}
        actions={
          <Select value={regionId} onChange={setRegionId}>
            <option value="">{t.filters.allRegions}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        }
      />

      <div className="flex flex-wrap gap-3 text-xs mb-4">
        {(['normal', 'irrigating', 'warning', 'danger'] as const).map((h) => (
          <div key={h} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: healthColor(h) }} />
            {(t.health as any)[h]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-4 min-h-[480px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-auto">
            {lines.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => void openLine(l)}
                className="text-left border rounded-xl p-3 hover:shadow-md transition bg-white"
                style={{ borderLeft: `4px solid ${healthColor(l.health)}` }}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-primary font-semibold text-sm">{l.code}</span>
                  <HealthBadge health={l.health} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{l.regionName}</div>
                <div className="text-xs text-slate-600 mt-2 flex justify-between">
                  <span>{l.plantType}</span>
                  <span>
                    {l.moisture != null ? `${l.moisture.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </button>
            ))}
            {!lines.length && <Empty />}
          </div>
        </Card>

        <Card className="p-4">
          {!selected ? (
            <p className="text-sm text-slate-400 py-10 text-center">{t.actions.detail}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-primary font-bold text-lg">{selected.code}</div>
                  <div className="text-sm text-slate-500">{selected.regionName}</div>
                </div>
                <button className="text-slate-400 text-sm" onClick={() => setSelected(null)}>
                  {t.actions.close}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <HealthBadge health={selected.irrigationOn ? 'irrigating' : 'normal'} />
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100">
                  {selected.irrigationOn ? t.status.on : t.status.off}
                </span>
              </div>

              <div className="space-y-2">
                {(selected.sensors || []).map((s: any) => (
                  <div
                    key={s.id}
                    className="flex justify-between text-sm bg-emerald-50/60 rounded-lg px-3 py-2"
                  >
                    <span className="text-slate-600">
                      {(t.sensors as any)[s.type] || s.type}
                    </span>
                    <span className="font-semibold">
                      {s.last_reading
                        ? `${s.last_reading.value} ${s.last_reading.unit}`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                variant={selected.irrigationOn ? 'info' : 'primary'}
                onClick={() => void toggleIrrigation()}
              >
                {selected.irrigationOn ? t.actions.turnOff : t.actions.turnOn}
              </Button>

              {moistureHistory.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">
                    {(t.sensors as any).soil_moisture} (24h)
                  </div>
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                      <AreaChart data={moistureHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#15803D" fill="#22C55E33" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
