import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Droplets, Gauge, Waves } from 'lucide-react';
import { io } from 'socket.io-client';
import {
  AnimatedNumber,
  Card,
  HealthBadge,
  KpiCard,
  Loading,
  PageHeader,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/api';
import { formatTime } from '../lib/utils';

interface LiveReading {
  lineCode: string;
  sensorType: string;
  value: number;
  unit: string;
  recordedAt: string;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [live, setLive] = useState<LiveReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/ops/overview'), api('/ops/alerts')])
      .then(([o, a]) => {
        setOverview(o);
        setAlerts((a || []).slice(0, 6));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    const socket = io('http://localhost:3000/realtime', {
      transports: ['websocket'],
    });
    socket.on('sensor:reading', (payload: LiveReading) => {
      setLive((prev) => [payload, ...prev].slice(0, 25));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) return <Loading />;
  if (error && !overview) {
    return (
      <Card className="p-6 text-red-700">
        <div className="font-semibold">API ulanmadi</div>
        <div className="text-sm mt-1">{error}</div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title={t.pages.dashboardTitle}
        description={t.pages.dashboardDesc}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard
          label={t.kpi.activeLines}
          value={<AnimatedNumber value={overview?.activeLines ?? 0} />}
          sub={`${overview?.irrigatingLines ?? 0} ${t.kpi.irrigating}`}
          icon={<Activity size={18} />}
        />
        <KpiCard
          label={t.kpi.flow}
          value={
            <>
              <AnimatedNumber value={overview?.currentFlowM3h ?? 0} decimals={2} /> m³/h
            </>
          }
          accent="info"
          icon={<Waves size={18} />}
        />
        <KpiCard
          label={t.kpi.moisture}
          value={
            <>
              <AnimatedNumber value={overview?.avgSoilMoisture ?? 0} decimals={1} />%
            </>
          }
          icon={<Gauge size={18} />}
        />
        <KpiCard
          label={t.kpi.savedToday}
          value={
            <>
              <AnimatedNumber value={overview?.todaySavedM3 ?? 0} decimals={1} /> m³
            </>
          }
          icon={<Droplets size={18} />}
        />
        <KpiCard
          label={t.kpi.faulty}
          value={<AnimatedNumber value={overview?.faultySensors ?? 0} />}
          sub={`${overview?.openTickets ?? 0} ${t.kpi.openTickets}`}
          accent={overview?.faultySensors > 0 ? 'danger' : 'primary'}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-50 font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            {t.live}
          </div>
          <div className="divide-y divide-emerald-50 max-h-96 overflow-auto">
            {live.length === 0 && (
              <div className="p-6 text-sm text-slate-400">{t.noData} — simulator ishlayotganini tekshiring</div>
            )}
            {live.map((r, i) => (
              <div
                key={`${r.lineCode}-${r.sensorType}-${r.recordedAt}-${i}`}
                className="px-4 py-2.5 flex justify-between text-sm gap-3"
              >
                <div>
                  <span className="font-mono text-primary font-medium">{r.lineCode}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-600">
                    {(t.sensors as any)[r.sensorType] || r.sensorType}
                  </span>
                </div>
                <div className="font-semibold tabular shrink-0">
                  {r.value} {r.unit}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-50 font-medium text-sm">
            {t.nav.alerts}
          </div>
          <div className="divide-y divide-emerald-50 max-h-96 overflow-auto">
            {alerts.length === 0 && (
              <div className="p-6 text-sm text-slate-400">{t.noData}</div>
            )}
            {alerts.map((a) => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <HealthBadge
                    health={
                      a.severity === 'danger'
                        ? 'danger'
                        : a.severity === 'warning'
                          ? 'warning'
                          : 'normal'
                    }
                  />
                  <span className="text-xs text-slate-400">{formatTime(a.createdAt)}</span>
                </div>
                <div className="mt-1 text-slate-700">{a.message}</div>
                {a.lineCode && (
                  <div className="text-xs font-mono text-primary mt-1">{a.lineCode}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
