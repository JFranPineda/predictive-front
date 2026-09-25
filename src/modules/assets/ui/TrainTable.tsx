import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { StatusBadge } from '@shared/ui/StatusBadge';

import { overdueDays } from '../domain/status';
import type { Equipment, TrainRow, TrainStatus } from '../domain/types';
import { useDeleteEquipmentMutation } from '../infrastructure/endpoints';
import { readApiError } from './EquipmentFormModal';

const HEAD = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500';
const CELL = 'px-3 py-2 align-top';
const ACTION = 'whitespace-nowrap text-xs font-medium text-sky-600';

/** Trains as rows; each opens to show its machines and what can be done with them. */
export function TrainTable({
  rows,
  expandAll,
  canManage,
  onEdit,
}: {
  rows: TrainRow[];
  expandAll: boolean;
  canManage: boolean;
  onEdit: (equipment: Equipment) => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [deleteEquipment] = useDeleteEquipmentMutation();

  // "Sin evaluar" is the server's fallback; the client says it in its language.
  const statusLabel = (status: TrainStatus) =>
    status.code === 'not_evaluated' ? t('status.notEvaluated') : status.name;

  const toggle = (id: number) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  async function remove(equipment: Equipment) {
    setError(null);
    try {
      // The server deactivates anything with readings behind it rather than
      // destroying it, and says so in the response.
      await deleteEquipment(equipment.id).unwrap();
    } catch (cause) {
      setError(readApiError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <div className="overflow-x-auto">
      {error && <p className="m-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className={HEAD}>{t('column.group')}</th>
            <th className={HEAD}>{t('trains.kind')}</th>
            <th className={HEAD}>{t('column.area')}</th>
            <th className={HEAD}>{t('column.status')}</th>
            <th className={`${HEAD} text-right`}>{t('trains.machines')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = expandAll || open.has(row.id);
            return (
              <Fragment key={row.id}>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className={CELL}>
                    <button
                      onClick={() => toggle(row.id)}
                      aria-expanded={expanded}
                      className="flex items-baseline gap-2 text-left"
                    >
                      <span className="w-3 text-slate-400">{expanded ? '▾' : '▸'}</span>
                      <span>
                        <span className="block font-medium">{row.name}</span>
                        <span className="block font-mono text-[11px] text-slate-400">{row.code}</span>
                      </span>
                    </button>
                  </td>
                  <td className={`${CELL} text-slate-500`}>{row.kind?.name ?? '—'}</td>
                  <td className={`${CELL} text-slate-500`} title={row.area.name}>
                    {row.area.code}
                  </td>
                  <td className={CELL}>
                    <StatusBadge label={statusLabel(row.status)} color={row.status.color} />
                  </td>
                  <td className={`${CELL} text-right tabular-nums`}>
                    {t('trains.machineCount', { count: row.equipment_count })}
                  </td>
                </tr>
                {expanded &&
                  row.equipments.map((machine) => (
                    <tr key={machine.id} className="border-b border-slate-50 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-900/40">
                      <td className={`${CELL} pl-10`}>
                        <span className="font-medium">{machine.name}</span>{' '}
                        <span className="font-mono text-xs text-slate-500">
                          {machine.client_tag || machine.asset_code}
                        </span>
                      </td>
                      <td className={`${CELL} text-slate-500`}>
                        {t(`type.${machine.equipment_type}`, { defaultValue: machine.equipment_type })} ·{' '}
                        {t(`frequency.${machine.monitoring_frequency}`)}
                      </td>
                      <td className={`${CELL} text-slate-500`}>
                        <OverdueNote equipment={machine} />
                      </td>
                      <td className={CELL}>
                        <StatusBadge
                          label={statusLabel(machine.effective_status)}
                          color={machine.effective_status.color}
                        />
                      </td>
                      <td className={`${CELL} text-right`}>
                        <span className="flex flex-wrap justify-end gap-3">
                          <Link to={`/measurements/groups/${row.id}?equipment=${machine.id}`} className={ACTION}>
                            {t('openTrend')}
                          </Link>
                          <Link to={`/assets/${machine.id}/media`} className={ACTION}>
                            {t('openGallery')}
                          </Link>
                          <Link to={`/measurements/groups/${row.id}/spectra`} className={ACTION}>
                            {t('openSpectra')}
                          </Link>
                          {canManage && (
                            <>
                              <button onClick={() => onEdit(machine)} className={ACTION}>
                                {t('common:action.edit')}
                              </button>
                              <button onClick={() => void remove(machine)} className={`${ACTION} text-red-600`}>
                                {t('common:action.delete')}
                              </button>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OverdueNote({ equipment }: { equipment: Equipment }) {
  const { t } = useTranslation('assets');
  const overdue = overdueDays(equipment);
  return overdue ? <span className="text-amber-600">{t('overdue', { count: overdue })}</span> : <span>—</span>;
}
