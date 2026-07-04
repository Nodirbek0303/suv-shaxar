import { FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  HealthBadge,
  Input,
  Loading,
  PageHeader,
  Select,
  Toast,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { formatTime } from '../lib/utils';

export default function SensorsPage() {
  const { t } = useI18n();
  const [sensors, setSensors] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    lineId: '',
    type: 'soil_moisture',
    serialNumber: '',
  });

  async function load() {
    const [s, l] = await Promise.all([api('/ops/sensors'), api('/lines')]);
    setSensors(s);
    setLines(l);
    if (!form.lineId && l[0]) setForm((f) => ({ ...f, lineId: l[0].id }));
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api('/ops/sensors', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setForm((f) => ({ ...f, serialNumber: '' }));
    setToast(t.actions.save);
    await load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.sensorsTitle}
        description={t.pages.sensorsDesc}
      />

      <form
        onSubmit={onCreate}
        className="bg-white border border-emerald-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
      >
        <Select value={form.lineId} onChange={(v) => setForm({ ...form, lineId: v })}>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </Select>
        <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })}>
          <option value="soil_moisture">{t.sensors.soil_moisture}</option>
          <option value="water_flow">{t.sensors.water_flow}</option>
          <option value="temperature">{t.sensors.temperature}</option>
        </Select>
        <Input
          value={form.serialNumber}
          onChange={(v) => setForm({ ...form, serialNumber: v })}
          placeholder="Serial"
        />
        <Button type="submit">{t.actions.add}</Button>
      </form>

      <Card className="overflow-hidden">
        {!sensors.length ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Serial</th>
                  <th className="text-left px-4 py-3">Liniya</th>
                  <th className="text-left px-4 py-3">Tur</th>
                  <th className="text-left px-4 py-3">Holat</th>
                  <th className="text-left px-4 py-3">Qiymat</th>
                  <th className="text-left px-4 py-3">Batareya</th>
                  <th className="text-left px-4 py-3">Aloqa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {sensors.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs">{s.serialNumber}</td>
                    <td className="px-4 py-3 font-mono text-primary">{s.lineCode}</td>
                    <td className="px-4 py-3">{(t.sensors as any)[s.type] || s.type}</td>
                    <td className="px-4 py-3">
                      <HealthBadge health={s.online ? 'normal' : 'danger'} />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {s.lastReading
                        ? `${s.lastReading.value} ${s.lastReading.unit}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{s.batteryPercent}%</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatTime(s.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
