import { useI18n } from '../i18n/I18nContext';
import { healthColor } from '../lib/utils';
import { Card } from './ui';

export default function ProvinceMap({
  regions,
  selectedId,
  onSelect,
}: {
  regions: any[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <Card className="p-4 h-full min-h-[360px]">
      <div className="text-sm font-medium text-slate-700 mb-3">{t.map.title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(regions || []).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect?.(r.id)}
            className={`text-left border rounded-lg p-3 hover:border-secondary transition ${
              selectedId === r.id
                ? 'border-secondary bg-secondary/5'
                : 'border-slate-200'
            }`}
            style={{
              borderLeftWidth: 4,
              borderLeftColor: healthColor(r.plantHealthLevel),
            }}
          >
            <div className="font-medium text-sm">{r.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              {r.lineCount} {t.map.linesInRegion} · {r.plantHealthScore}
            </div>
          </button>
        ))}
      </div>
      {!(regions || []).length && (
        <div className="text-sm text-slate-400 text-center py-8">{t.noData}</div>
      )}
    </Card>
  );
}
