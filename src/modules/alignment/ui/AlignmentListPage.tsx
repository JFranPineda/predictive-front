import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { usePermissions } from '@app/hooks';
import { formatDateTime } from '@app/i18n/format';
import { useAssetGroupsQuery } from '@modules/assets';
import { readError } from '@shared/lib/apiError';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

import type { AlignmentRecord, StateRef } from '../domain/types';
import { useAlignmentRecordsQuery, useDeleteAlignmentRecordMutation } from '../infrastructure/endpoints';
import { AlignmentForm, AlignmentRecordCard } from './AlignmentPanel';

/**
 * Mediciones → Alineamiento: every alignment of the month, whichever way it
 * was registered — from a visit of an alignment order, or here as a one-off
 * job with no order behind it. Open one to edit its values and images, or
 * delete it; "+ Nuevo" registers a one-off job (V3-17, Q10).
 */
export default function AlignmentListPage() {
  const { t } = useTranslation(['alignment', 'common']);
  const permissions = usePermissions();
  const canManage = permissions.has('alignment.manage');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useAlignmentRecordsQuery({ month });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((record) =>
      [record.asset_group.name, record.driver_label, record.driven_label, record.order_code ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [data, search]);
  const opened = data?.find((record) => record.id === openId) ?? null;

  return (
    <Page>
      <PageHeader
        title={t('list.title')}
        description={t('list.hint')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {t('list.new')}
            </Button>
          )
        }
      />

      <Explainer startOpen={!isLoading && (data?.length ?? 0) === 0} />

      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t('list.month')}>
          <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-48" />
        </FormField>
        <FormField label={t('list.search')}>
          <TextInput
            type="search"
            value={search}
            placeholder={t('list.searchHint')}
            onChange={(event) => setSearch(event.target.value)}
            className="w-80"
          />
        </FormField>
      </div>

      {isLoading ? (
        <Spinner label={t('common:state.loading')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('list.empty')} body={canManage ? t('list.emptyHint') : undefined} />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-4 py-2.5">{t('column.date')}</th>
                  <th className="px-4 py-2.5">{t('column.group')}</th>
                  <th className="px-4 py-2.5">{t('column.machines')}</th>
                  <th className="px-4 py-2.5 text-right">{t('field.rpm')}</th>
                  <th className="px-4 py-2.5">{t('column.states')}</th>
                  <th className="px-4 py-2.5">{t('column.origin')}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((record) => (
                  <Row key={record.id} record={record} onOpen={() => setOpenId(record.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {opened && <RecordModal record={opened} onClose={() => setOpenId(null)} />}
      {creating && (
        <NewModal
          onClose={() => setCreating(false)}
          onCreated={(record) => {
            setCreating(false);
            // A record made this month shows in this month's list.
            setMonth(record.created_at.slice(0, 7));
            setOpenId(record.id);
          }}
        />
      )}
    </Page>
  );
}

/** What this screen is for, with a worked example: the question the person
 * reading it for the first time actually asks. */
function Explainer({ startOpen }: { startOpen: boolean }) {
  const { t } = useTranslation('alignment');
  return (
    <details open={startOpen} className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/40">
      <summary className="cursor-pointer font-medium text-sky-900 dark:text-sky-200">{t('explain.title')}</summary>
      <div className="mt-3 space-y-2 text-slate-700 dark:text-slate-300">
        <p>{t('explain.what')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('explain.values')}</li>
          <li>{t('explain.states')}</li>
          <li>{t('explain.images')}</li>
        </ul>
        <p className="rounded-lg bg-white p-3 font-mono text-xs dark:bg-slate-900">{t('explain.example')}</p>
        <p className="text-xs text-slate-500">{t('explain.where')}</p>
      </div>
    </details>
  );
}

function Row({ record, onOpen }: { record: AlignmentRecord; onOpen: () => void }) {
  const { t } = useTranslation('alignment');
  return (
    <tr className="border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
      <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-500">
        {formatDateTime(record.created_at)}
      </td>
      <td className="px-4 py-2.5 font-medium">{record.asset_group.name}</td>
      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
        {record.driver_label || '—'} → {record.driven_label || '—'}
        <span className="block text-xs text-slate-400">{t(`aligner.${record.aligner}`)}</span>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">{Number(record.rpm)}</td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1 text-xs">
          <State state={record.found_state} />→<State state={record.state} />
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs">
        {record.service_visit_id ? (
          <Link to={`/services/visits/${record.service_visit_id}`} className="text-sky-600 hover:underline">
            {record.order_code ?? t('list.openVisit')}
          </Link>
        ) : (
          <span className="text-slate-500">{t('list.oneOff')}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button onClick={onOpen}>{record.can_edit ? t('list.edit') : t('list.view')}</Button>
      </td>
    </tr>
  );
}

function State({ state }: { state: StateRef | null }) {
  return state ? <StatusBadge label={state.name} color={state.color} size="sm" /> : <span className="text-slate-400">—</span>;
}

function RecordModal({ record, onClose }: { record: AlignmentRecord; onClose: () => void }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [remove, removing] = useDeleteAlignmentRecordMutation();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function destroy() {
    setError(null);
    try {
      await remove(record.id).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      size="xl"
      title={record.asset_group.name}
      description={`${record.driver_label || '—'} → ${record.driven_label || '—'} · ${formatDateTime(record.created_at)}`}
      onClose={onClose}
      footer={
        <>
          {record.can_edit &&
            (confirming ? (
              <>
                <span className="mr-auto self-center text-sm text-red-700">{t('list.confirmDelete')}</span>
                <Button onClick={() => setConfirming(false)}>{t('common:action.cancel')}</Button>
                <Button variant="danger" disabled={removing.isLoading} onClick={() => void destroy()}>
                  {t('common:action.delete')}
                </Button>
              </>
            ) : (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirming(true)}>
                {t('common:action.delete')}
              </Button>
            ))}
          {!confirming && <Button onClick={onClose}>{t('list.close')}</Button>}
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <AlignmentRecordCard record={record} canEdit={record.can_edit} />
    </Modal>
  );
}

/** A one-off job: pick the train, then fill the same form a visit shows. */
function NewModal({ onClose, onCreated }: { onClose: () => void; onCreated: (record: AlignmentRecord) => void }) {
  const { t } = useTranslation(['alignment', 'common']);
  const groups = useAssetGroupsQuery();
  const [filter, setFilter] = useState('');
  const [groupId, setGroupId] = useState(0);
  const options = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return (groups.data ?? []).filter((group) => !term || group.name.toLowerCase().includes(term)).slice(0, 200);
  }, [groups.data, filter]);

  return (
    <Modal size="xl" title={t('list.newTitle')} description={t('list.newHint')} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t('list.findGroup')}>
          <TextInput
            type="search"
            value={filter}
            placeholder={t('list.findGroupHint')}
            onChange={(event) => setFilter(event.target.value)}
          />
        </FormField>
        <FormField label={t('column.group')}>
          <Select value={groupId || ''} onChange={(event) => setGroupId(Number(event.target.value))}>
            <option value="">—</option>
            {options.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      {groupId > 0 ? (
        <AlignmentForm key={groupId} assetGroupId={groupId} onCreated={onCreated} />
      ) : (
        <p className="text-sm text-slate-500">{t('list.pickGroupFirst')}</p>
      )}
    </Modal>
  );
}
