import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatDate } from '@app/i18n/format';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';

import { useOtherFaultsQuery } from '../infrastructure/endpoints';

/**
 * What the crews wrote under "Otros", newest first.
 *
 * A description that keeps coming back is a fault mode the catalogue is
 * missing; this is where somebody notices it.
 */
export function OtherFaultsCard({ technique }: { technique?: string }) {
  const { t } = useTranslation('diagnostics');
  const { data } = useOtherFaultsQuery({ technique });
  const rows = data ?? [];

  return (
    <Card title={t('others.title')} description={t('others.hint')}>
      {rows.length === 0 ? (
        <EmptyState title={t('others.empty')} />
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {rows.map((row) => (
            <li key={row.visit_id} className="flex flex-wrap gap-x-3 gap-y-1 py-2">
              <span className="font-medium">{row.description}</span>
              <span className="text-slate-500">
                {row.technique_name} · {row.group_name} · {row.equipment_name}
              </span>
              <Link to={`/services/visits/${row.visit_id}`} className="ml-auto text-xs text-sky-600">
                {formatDate(row.visited_at)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
