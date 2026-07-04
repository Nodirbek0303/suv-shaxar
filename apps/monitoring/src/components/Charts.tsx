import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../i18n/I18nContext';
import { healthColor } from '../lib/utils';
import { Card } from './ui';

function ChartCard({
  title,
  children,
  height = 280,
}: {
  title: string;
  children: React.ReactElement;
  height?: number;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function TrendChart({ data }: { data: any[] }) {
  const { t } = useI18n();
  const rows = (data || []).map((d) => ({
    name: new Date(d.periodStart).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: 'short',
    }),
    usage: n(n(d.waterUsedM3).toFixed(2)),
    saved: n(n(d.waterSavedM3).toFixed(2)),
  }));

  if (!rows.length) {
    return (
      <Card className="p-4 min-h-[280px] flex items-center justify-center text-slate-400 text-sm">
        {t.noData}
      </Card>
    );
  }

  return (
    <ChartCard title={t.charts.trend30} height={300}>
      <ComposedChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="saved" name={t.charts.saved} fill="#00AEEF" radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="usage"
          name={t.charts.usage}
          stroke="#003087"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartCard>
  );
}

export function RegionSavingsChart({ regions }: { regions: any[] }) {
  const { t } = useI18n();
  const rows = [...(regions || [])]
    .sort((a, b) => n(b.waterSavedPercent) - n(a.waterSavedPercent))
    .map((r) => ({
      name: String(r.name || '')
        .replace(' tumani', '')
        .replace(' shahri', ''),
      pct: n(r.waterSavedPercent),
      fill: healthColor(r.plantHealthLevel),
    }));

  if (!rows.length) {
    return (
      <Card className="p-4 min-h-[280px] flex items-center justify-center text-slate-400 text-sm">
        {t.noData}
      </Card>
    );
  }

  return (
    <ChartCard title={t.charts.regionSavings} height={300}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="pct" name="%" radius={[0, 4, 4, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

export function PlantDonut({
  distribution,
}: {
  distribution?: { good: number; average: number; poor: number };
}) {
  const { t } = useI18n();
  const rows = [
    { name: t.health.good, value: n(distribution?.good), color: '#22C55E' },
    { name: t.health.average, value: n(distribution?.average), color: '#EAB308' },
    { name: t.health.poor, value: n(distribution?.poor), color: '#EF4444' },
  ];

  return (
    <ChartCard title={t.charts.plantDist} height={280}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
        >
          {rows.map((r, i) => (
            <Cell key={i} fill={r.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}

export function ComparisonChart({ regions }: { regions: any[] }) {
  const { t } = useI18n();
  const rows = (regions || []).map((r) => ({
    name: String(r.name || '')
      .replace(' tumani', '')
      .replace(' shahri', ''),
    usage: n(n(r.waterUsedM3).toFixed(1)),
    saved: n(n(r.waterSavedM3).toFixed(1)),
  }));

  if (!rows.length) {
    return (
      <Card className="p-4 min-h-[280px] flex items-center justify-center text-slate-400 text-sm">
        {t.noData}
      </Card>
    );
  }

  return (
    <ChartCard title={t.charts.comparison} height={320}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="usage" name={t.charts.usage} fill="#003087" radius={[4, 4, 0, 0]} />
        <Bar dataKey="saved" name={t.charts.saved} fill="#00AEEF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function AreaTrendChart({ data, title }: { data: any[]; title?: string }) {
  const { t } = useI18n();
  const rows = (data || []).map((d) => ({
    name: new Date(d.periodStart).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: 'short',
    }),
    usage: n(n(d.waterUsedM3).toFixed(2)),
    saved: n(n(d.waterSavedM3).toFixed(2)),
  }));

  if (!rows.length) {
    return (
      <Card className="p-4 min-h-[280px] flex items-center justify-center text-slate-400 text-sm">
        {t.noData}
      </Card>
    );
  }

  return (
    <ChartCard title={title || t.charts.dynamics} height={300}>
      <AreaChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="usage"
          name={t.charts.usage}
          stroke="#003087"
          fill="#00308722"
        />
        <Area
          type="monotone"
          dataKey="saved"
          name={t.charts.saved}
          stroke="#00AEEF"
          fill="#00AEEF33"
        />
      </AreaChart>
    </ChartCard>
  );
}
