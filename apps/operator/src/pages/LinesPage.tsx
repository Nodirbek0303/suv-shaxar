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
import { api, getUser } from '../lib/api';

export default function LinesPage() {
  const { t } = useI18n();
  const user = getUser<{ role: string }>();
  const [lines, setLines] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [regionId, setRegionId] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    code: '',
    regionId: '',
    plantType: 'Gulzor',
    lengthMeters: '100',
    lng1: '66.96',
    lat1: '39.65',
    lng2: '66.98',
    lat2: '39.66',
  });

  async function load() {
    const [l, r] = await Promise.all([api('/lines'), api('/regions')]);
    setLines(l);
    const regs = r.filter((x: any) => x.level === 'tuman' || x.level === 'shahar');
    setRegions(regs);
    if (!form.regionId && regs[0]) setForm((f) => ({ ...f, regionId: regs[0].id }));
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  const filtered = lines.filter((l) => {
    if (regionId && l.regionId !== regionId) return false;
    if (q && !l.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api('/lines', {
      method: 'POST',
      body: JSON.stringify({
        code: form.code,
        regionId: form.regionId,
        plantType: form.plantType,
        lengthMeters: Number(form.lengthMeters),
        coordinates: [
          { lng: Number(form.lng1), lat: Number(form.lat1) },
          { lng: Number(form.lng2), lat: Number(form.lat2) },
        ],
      }),
    });
    setShowForm(false);
    setForm((f) => ({ ...f, code: '' }));
    setToast(t.actions.save);
    await load();
  }

  async function remove(id: string) {
    if (!confirm('O‘chirish?')) return;
    await api(`/lines/${id}`, { method: 'DELETE' });
    setToast(t.actions.delete);
    await load();
  }

  async function toggle(id: string, on: boolean) {
    await api(`/lines/${id}/irrigation`, {
      method: 'POST',
      body: JSON.stringify({ irrigationOn: !on, irrigationMode: 'manual' }),
    });
    await load();
  }

  async function bulk(on: boolean) {
    if (!selected.length) return;
    await api('/ops/bulk-irrigation', {
      method: 'POST',
      body: JSON.stringify({ lineIds: selected, irrigationOn: on }),
    });
    setSelected([]);
    setToast(on ? t.actions.turnOn : t.actions.turnOff);
    await load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.linesTitle}
        description={t.pages.linesDesc}
        actions={
          <>
            {selected.length > 0 && (
              <>
                <Button variant="info" onClick={() => void bulk(true)}>
                  {t.actions.turnOn} ({selected.length})
                </Button>
                <Button variant="outline" onClick={() => void bulk(false)}>
                  {t.actions.turnOff}
                </Button>
              </>
            )}
            <Button onClick={() => setShowForm((v) => !v)}>
              {showForm ? t.actions.close : t.actions.add}
            </Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={regionId} onChange={setRegionId}>
          <option value="">{t.filters.allRegions}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>
        <Input
          value={q}
          onChange={setQ}
          placeholder={t.filters.search}
          className="sm:max-w-xs"
        />
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="bg-white border border-emerald-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Input value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="SAM-REG-001-L099" />
          <Select value={form.regionId} onChange={(v) => setForm({ ...form, regionId: v })}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          <Input value={form.plantType} onChange={(v) => setForm({ ...form, plantType: v })} placeholder="Plant" />
          <Input value={form.lengthMeters} onChange={(v) => setForm({ ...form, lengthMeters: v })} placeholder="m" />
          <Input value={form.lng1} onChange={(v) => setForm({ ...form, lng1: v })} placeholder="lng1" />
          <Input value={form.lat1} onChange={(v) => setForm({ ...form, lat1: v })} placeholder="lat1" />
          <Input value={form.lng2} onChange={(v) => setForm({ ...form, lng2: v })} placeholder="lng2" />
          <Input value={form.lat2} onChange={(v) => setForm({ ...form, lat2: v })} placeholder="lat2" />
          <Button type="submit">{t.actions.save}</Button>
        </form>
      )}

      <Card className="overflow-hidden">
        {!filtered.length ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/80 text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.length === filtered.length}
                      onChange={(e) =>
                        setSelected(e.target.checked ? filtered.map((l) => l.id) : [])
                      }
                    />
                  </th>
                  <th className="text-left px-3 py-3">Kod</th>
                  <th className="text-left px-3 py-3">{t.filters.region}</th>
                  <th className="text-left px-3 py-3">{t.filters.status}</th>
                  <th className="text-left px-3 py-3">Sug‘orish</th>
                  <th className="text-right px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-emerald-50/40">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(l.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked ? [...s, l.id] : s.filter((x) => x !== l.id),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-primary font-medium">{l.code}</td>
                    <td className="px-3 py-3">{l.regionName}</td>
                    <td className="px-3 py-3">
                      <HealthBadge health={l.irrigationOn ? 'irrigating' : 'normal'} />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        className="text-xs text-info font-medium hover:underline"
                        onClick={() => void toggle(l.id, l.irrigationOn)}
                      >
                        {l.irrigationOn ? t.actions.turnOff : t.actions.turnOn}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {user?.role === 'obodonlashtirish_admin' && (
                        <button
                          className="text-xs text-danger hover:underline"
                          onClick={() => void remove(l.id)}
                        >
                          {t.actions.delete}
                        </button>
                      )}
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
