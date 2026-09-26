import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAssetGroupsQuery } from '@modules/assets';
import { useCompanyUsersQuery } from '@modules/users';
import { formatDateTime } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import {
  useCreateWorkRecordMutation,
  useUpdateWorkRecordMutation,
  useWorkRecordsQuery,
} from '../infrastructure/endpoints';
import { WORK_TYPES, type WorkRecord, type WorkType } from '../domain/types';

export default function WorkRecordListPage() {
  const { t } = useTranslation(['maintenance', 'common']);
  const [group, setGroup] = useState(0);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const groups = useAssetGroupsQuery();
  const records = useWorkRecordsQuery({ group: group || undefined, month });
  const [showForm, setShowForm] = useState(false);

  return (
    <Page>
      <PageHeader
        title={t('list.title')}
        description={t('list.hint')}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            {t('list.newRecord')}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={group} onChange={(event) => setGroup(Number(event.target.value))} className="w-64">
          <option value={0}>{t('list.allGroups')}</option>
          {groups.data?.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-48" />
      </div>

      {showForm && <NewRecordForm onClose={() => setShowForm(false)} />}

      {records.isLoading ? (
        <Spinner label={t('common:loading')} />
      ) : !records.data || records.data.length === 0 ? (
        <EmptyState title={t('list.empty')} />
      ) : (
        <div className="space-y-3">
          {records.data.map((row) => (
            <RecordRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </Page>
  );
}

function RecordRow({ row }: { row: WorkRecord }) {
  const { t } = useTranslation(['maintenance', 'common']);
  const [update] = useUpdateWorkRecordMutation();
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setError(null);
    try {
      await update({ id: row.id, close: true }).unwrap();
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('form.genericError'));
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {row.asset_group.name}
            {row.equipment && <span className="text-slate-400"> · {row.equipment.name}</span>}
          </p>
          <p className="text-sm text-slate-500">
            {row.work_types.map((code) => t(`workType.${code}`)).join(' / ') || '—'}
            {row.other_description && ` (${row.other_description})`}
          </p>
          <p className="text-xs text-slate-400">
            {row.started_at ? formatDateTime(row.started_at) : '—'}
            {' → '}
            {row.ended_at ? formatDateTime(row.ended_at) : '—'}
            {row.duration_minutes !== null && ` · ${Math.floor(row.duration_minutes / 60)}h ${row.duration_minutes % 60}min`}
          </p>
          <p className="text-xs text-slate-400">
            {row.responsibles.map((r) => r.name).join(', ') || t('list.noResponsibles')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              row.is_closed
                ? 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }
          >
            {row.is_closed ? t('list.closed') : t('list.open')}
          </span>
          {!row.is_closed && (
            <Button onClick={() => void close()}>{t('list.closeRecord')}</Button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </Card>
  );
}

function NewRecordForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['maintenance', 'common']);
  const groups = useAssetGroupsQuery();
  const users = useCompanyUsersQuery();
  const [create, { isLoading }] = useCreateWorkRecordMutation();
  const [assetGroup, setAssetGroup] = useState(0);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [otherDescription, setOtherDescription] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');
  const [sparePartsUsed, setSparePartsUsed] = useState('');
  const [userResponsible, setUserResponsible] = useState(0);
  const [externalName, setExternalName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleType(type: WorkType) {
    setWorkTypes((current) =>
      current.includes(type) ? current.filter((row) => row !== type) : [...current, type],
    );
  }

  async function submit() {
    setError(null);
    if (!assetGroup) {
      setError(t('form.groupRequired'));
      return;
    }
    const responsibles = [
      ...(userResponsible ? [{ user: userResponsible }] : []),
      ...(externalName.trim() ? [{ external_name: externalName.trim() }] : []),
    ];
    try {
      await create({
        asset_group: assetGroup,
        work_types: workTypes,
        other_description: otherDescription.trim(),
        started_at: startedAt || undefined,
        ended_at: endedAt || undefined,
        description: description.trim(),
        spare_parts_used: sparePartsUsed.trim(),
        responsibles,
      }).unwrap();
      onClose();
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('form.genericError'));
    }
  }

  return (
    <Card title={t('form.title')} description={t('form.hint')}>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.group')}>
          <Select value={assetGroup || ''} onChange={(event) => setAssetGroup(Number(event.target.value))}>
            <option value="">—</option>
            {groups.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('form.workTypes')}>
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            {WORK_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={workTypes.includes(type)}
                  onChange={() => toggleType(type)}
                />
                {t(`workType.${type}`)}
              </label>
            ))}
          </div>
        </FormField>
        {workTypes.includes('other') && (
          <FormField label={t('form.otherDescription')}>
            <TextInput value={otherDescription} onChange={(event) => setOtherDescription(event.target.value)} />
          </FormField>
        )}
        <FormField label={t('form.startedAt')}>
          <TextInput type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
        </FormField>
        <FormField label={t('form.endedAt')}>
          <TextInput type="datetime-local" value={endedAt} onChange={(event) => setEndedAt(event.target.value)} />
        </FormField>
        <FormField label={t('form.responsibleUser')}>
          <Select value={userResponsible || ''} onChange={(event) => setUserResponsible(Number(event.target.value))}>
            <option value="">—</option>
            {users.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.full_name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('form.externalResponsible')} hint={t('form.externalResponsibleHint')}>
          <TextInput value={externalName} onChange={(event) => setExternalName(event.target.value)} />
        </FormField>
        <FormField label={t('form.description')}>
          <TextArea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </FormField>
        <FormField label={t('form.sparePartsUsed')}>
          <TextArea rows={2} value={sparePartsUsed} onChange={(event) => setSparePartsUsed(event.target.value)} />
        </FormField>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" disabled={isLoading} onClick={() => void submit()}>
          {t('form.save')}
        </Button>
        <Button onClick={onClose}>{t('common:action.cancel')}</Button>
      </div>
    </Card>
  );
}
