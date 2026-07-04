import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Button,
  Card,
  Empty,
  Input,
  Loading,
  PageHeader,
  Select,
  Toast,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api, getUser } from '../lib/api';

export default function UsersPage() {
  const { t } = useI18n();
  const me = getUser<{ role: string }>();
  const isAdmin = me?.role === 'obodonlashtirish_admin';
  const [users, setUsers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: 'Admin123!',
    role: 'obodonlashtirish_operator',
    regionId: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([api('/users'), api('/regions')])
      .then(([u, r]) => {
        setUsers(u);
        setRegions(r);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) return <Loading />;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        regionId: form.regionId || undefined,
      }),
    });
    setForm((f) => ({ ...f, fullName: '', phone: '' }));
    setToast(t.actions.save);
    const u = await api('/users');
    setUsers(u);
  }

  return (
    <div>
      <PageHeader title={t.pages.usersTitle} description={t.pages.usersDesc} />

      <form
        onSubmit={onCreate}
        className="bg-white border border-emerald-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"
      >
        <Input value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="F.I.Sh." />
        <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="Telefon" />
        <Input value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Parol" />
        <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })}>
          <option value="obodonlashtirish_admin">Admin</option>
          <option value="obodonlashtirish_operator">Operator</option>
          <option value="hokimiyat_viewer">Hokimiyat</option>
        </Select>
        <Select value={form.regionId} onChange={(v) => setForm({ ...form, regionId: v })}>
          <option value="">Hudud</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>
        <Button type="submit">{t.actions.add}</Button>
      </form>

      <Card className="overflow-hidden">
        {!users.length ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/80 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Ism</th>
                <th className="text-left px-4 py-3">Telefon</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Hudud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.region_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
