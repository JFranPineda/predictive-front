import { useTranslation } from 'react-i18next';

import { useTechniquesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';

const CONTROL =
  'rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800';

/** Search by order, and narrow by service, status and dates. */
export function OrderFilters({
  text,
  onText,
  params,
  onParam,
  onClear,
}: {
  text: string;
  onText: (value: string) => void;
  params: URLSearchParams;
  onParam: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation(['services', 'common']);
  const techniques = useTechniquesQuery();
  const filtered = [...params.keys()].some((key) => key !== 'page');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={text}
        onChange={(event) => onText(event.target.value)}
        placeholder={t('orders.search')}
        aria-label={t('orders.search')}
        className={`w-64 ${CONTROL}`}
      />
      <select
        value={params.get('technique') ?? ''}
        onChange={(event) => onParam('technique', event.target.value)}
        aria-label={t('orders.column.technique')}
        className={CONTROL}
      >
        <option value="">{t('orders.allTechniques')}</option>
        {techniques.data?.map((technique) => (
          <option key={technique.code} value={technique.code}>
            {technique.name}
          </option>
        ))}
      </select>
      <select
        value={params.get('status') ?? ''}
        onChange={(event) => onParam('status', event.target.value)}
        aria-label={t('orders.column.status')}
        className={CONTROL}
      >
        <option value="">{t('orders.allStatuses')}</option>
        {(['planned', 'in_progress', 'done', 'cancelled'] as const).map((status) => (
          <option key={status} value={status}>
            {t(`orders.status.${status}`)}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        {t('orderForm.from')}
        <input
          type="date"
          value={params.get('from') ?? ''}
          onChange={(event) => onParam('from', event.target.value)}
          className={CONTROL}
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        {t('orderForm.to')}
        <input
          type="date"
          value={params.get('to') ?? ''}
          onChange={(event) => onParam('to', event.target.value)}
          className={CONTROL}
        />
      </label>
      {filtered && (
        <Button variant="ghost" onClick={onClear}>
          {t('orders.clearFilters')}
        </Button>
      )}
    </div>
  );
}
