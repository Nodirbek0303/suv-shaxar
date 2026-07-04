import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  HealthBadge,
  Loading,
  PageHeader,
  Toast,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';

export default function ProgramsPage() {
  const { t } = useI18n();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  async function load() {
    const p = await api('/ops/programs');
    setPrograms(p);
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function toggle(lineId: string, running: boolean) {
    await api(`/lines/${lineId}/irrigation`, {
      method: 'POST',
      body: JSON.stringify({
        irrigationOn: !running,
        irrigationMode: 'auto',
      }),
    });
    setToast(t.actions.save);
    await load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t.pages.programsTitle}
        description={t.pages.programsDesc}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {programs.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="font-mono text-primary text-sm mt-0.5">{p.lineCode}</div>
              </div>
              <HealthBadge health={p.status === 'running' ? 'irrigating' : 'normal'} />
            </div>
            <div className="mt-3 text-sm text-slate-600 space-y-1">
              <div>Jadval: {p.schedule}</div>
              <div>Namlik chegarasi: {p.moistureThreshold}%</div>
              <div>O‘simlik: {p.plantType}</div>
            </div>
            <Button
              className="w-full mt-4"
              variant={p.status === 'running' ? 'info' : 'primary'}
              onClick={() => void toggle(p.lineId, p.status === 'running')}
            >
              {p.status === 'running' ? t.actions.turnOff : t.actions.turnOn}
            </Button>
          </Card>
        ))}
      </div>
      {!programs.length && <Empty />}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
