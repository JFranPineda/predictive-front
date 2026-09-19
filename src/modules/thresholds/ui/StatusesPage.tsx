import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, TextInput } from '@shared/ui/Form';
import { ErrorState } from '@shared/ui/ErrorState';
import { Modal } from '@shared/ui/Modal';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { ConditionStatus } from '../domain/types';
import {
  useConditionStatusesQuery,
  useDeleteStatusMutation,
  useUpdateStatusMutation,
} from '../infrastructure/endpoints';
import { readError } from './StandardFormModal';
import { StatusFormModal } from './StatusFormModal';

export default function StatusesPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_status');
  const { data, isLoading, isError } = useConditionStatusesQuery();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ConditionStatus | null>(null);

  if (isLoading) return <Spinner label={t('statuses.loading')} />;

  const condition = data?.filter((status) => status.kind === 'condition') ?? [];
  const availability = data?.filter((status) => status.kind === 'availability') ?? [];

  return (
    <Page>
      <PageHeader
        title={t('statuses.title')}
        description={t('statuses.subtitle')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {t('statuses.new')}
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={t('statuses.condition')} description={t('statuses.conditionHint')}>
            <StatusList rows={condition} canManage={canManage} onEdit={setEditing} />
          </Card>
          <Card title={t('statuses.availability')} description={t('statuses.availabilityHint')}>
            <StatusList rows={availability} canManage={canManage} onEdit={setEditing} />
          </Card>
        </div>
      )}

      {creating && <StatusFormModal onClose={() => setCreating(false)} />}
      {editing && <StatusEditModal status={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function StatusList({
  rows,
  canManage,
  onEdit,
}: {
  rows: ConditionStatus[];
  canManage: boolean;
  onEdit: (status: ConditionStatus) => void;
}) {
  const { t } = useTranslation('thresholds');
  if (rows.length === 0) return <EmptyState title={t('statuses.empty')} />;
  return (
    <ul className="space-y-2">
      {rows.map((status) => (
        <StatusRow key={status.id} status={status} canManage={canManage} onEdit={onEdit} />
      ))}
    </ul>
  );
}

function StatusRow({
  status,
  canManage,
  onEdit,
}: {
  status: ConditionStatus;
  canManage: boolean;
  onEdit: (status: ConditionStatus) => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [updateStatus, updating] = useUpdateStatusMutation();
  const [removeStatus] = useDeleteStatusMutation();
  const [color, setColor] = useState(status.color);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    try {
      await removeStatus(status.id).unwrap();
    } catch (cause) {
      // The server refuses a status that has already judged a reading, and
      // says how many: that reason belongs on screen, not in the console.
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  const changed = color.toLowerCase() !== status.color.toLowerCase();

  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      {canManage ? (
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label={t('statuses.color', { name: status.name })}
          className="size-7 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-700"
        />
      ) : (
        <span className="size-5 shrink-0 rounded" style={{ backgroundColor: status.color }} />
      )}

      <span className="min-w-0 flex-1">
        <span className="block font-medium">{status.name}</span>
        <span className="block font-mono text-[11px] text-slate-400">{status.code}</span>
      </span>

      <span className="shrink-0 text-xs text-slate-500">
        {status.kind === 'condition'
          ? t('statuses.severity', { value: status.severity })
          : t(status.measurable ? 'statuses.measurable' : 'statuses.notMeasurable')}
      </span>

      {canManage && changed && (
        <button
          disabled={updating.isLoading}
          onClick={() => void updateStatus({ id: status.id, color })}
          className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
        >
          {t('statuses.save')}
        </button>
      )}

      {canManage && (
        <span className="flex shrink-0 gap-3">
          <button onClick={() => onEdit(status)} className="text-xs text-sky-600">
            {t('common:action.edit')}
          </button>
          <button onClick={() => void remove()} className="text-xs text-red-600">
            {t('common:action.delete')}
          </button>
        </span>
      )}

      {error && <span className="basis-full text-xs text-red-600">{error}</span>}
    </li>
  );
}

/** Everything about a status that is not its colour. */
function StatusEditModal({
  status,
  onClose,
}: {
  status: ConditionStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [update, { isLoading }] = useUpdateStatusMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: status.name,
    severity: status.severity,
    requires_action: status.requires_action,
    is_terminal: status.is_terminal,
    measurable: status.measurable,
  });

  async function submit() {
    setError(null);
    try {
      await update({
        id: status.id,
        names: { es: draft.name },
        severity: draft.severity,
        requires_action: draft.requires_action,
        is_terminal: draft.is_terminal,
        measurable: draft.measurable,
      }).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('statuses.edit', { name: status.name })}
      description={t('statuses.editHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={isLoading} onClick={() => void submit()}>
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <FormField label={t('form.name')}>
        <TextInput
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </FormField>

      {status.kind === 'condition' && (
        <FormField label={t('form.severity')} hint={t('form.severityHint')}>
          <TextInput
            type="number"
            min={0}
            value={draft.severity}
            onChange={(event) => setDraft({ ...draft, severity: Number(event.target.value) })}
          />
        </FormField>
      )}

      <div className="space-y-2 text-sm">
        <Toggle
          checked={draft.requires_action}
          label={t('form.requiresAction')}
          onChange={(value) => setDraft({ ...draft, requires_action: value })}
        />
        <Toggle
          checked={draft.is_terminal}
          label={t('form.isTerminal')}
          onChange={(value) => setDraft({ ...draft, is_terminal: value })}
        />
        {status.kind === 'availability' && (
          <Toggle
            checked={draft.measurable}
            label={t('form.measurable')}
            hint={t('form.measurableHint')}
            onChange={(value) => setDraft({ ...draft, measurable: value })}
          />
        )}
      </div>
    </Modal>
  );
}

function Toggle({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
