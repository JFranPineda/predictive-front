import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAreasQuery } from '@modules/assets';
import { readError } from '@shared/lib/apiError';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Spinner } from '@shared/ui/Spinner';

import { parseNumbers, type RollerEntry, type RollerGroup } from '../domain/types';
import {
  useAddRollersMutation,
  useCreateRollerGroupMutation,
  useDeleteRollerGroupMutation,
  useDeleteRollerMutation,
  useRenameRollerGroupMutation,
  useRollerGroupsQuery,
  useRollersQuery,
  useSetRollerRetiredMutation,
} from '../infrastructure/endpoints';

/**
 * The catalogue the sheets read from: groups of rollers (a secadora, a
 * press section) and their numbered rollers. Created, renamed, retired and
 * removed here, without going through Estructura. A roller that was ever
 * measured can only be retired, so the orders it belongs to stay complete.
 */
export function RollerCatalogue({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const groups = useRollerGroupsQuery();
  const [selected, setSelected] = useState(0);
  const group = groups.data?.find((row) => row.id === selected) ?? groups.data?.[0];

  if (groups.isLoading) return <Spinner label={t('common:state.loading')} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-4">
        <Card title={t('catalogue.groups')} padded={false}>
          {(groups.data ?? []).length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t('page.noGroups')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {groups.data?.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row.id)}
                    className={clsx(
                      'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm',
                      row.id === group?.id
                        ? 'bg-slate-100 font-medium dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    )}
                  >
                    <span>
                      {row.name}
                      <span className="block text-xs font-normal text-slate-500">{row.sector}</span>
                    </span>
                    <span className="tabular-nums text-xs text-slate-500">
                      {t('catalogue.rollerCount', { count: row.rollers })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {canManage && <NewGroup onCreated={setSelected} />}
      </div>

      {group ? (
        <GroupRollers key={group.id} group={group} canManage={canManage} />
      ) : (
        <EmptyState title={t('page.noGroups')} body={t('catalogue.noGroupsHint')} />
      )}
    </div>
  );
}

function NewGroup({ onCreated }: { onCreated: (id: number) => void }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const areas = useAreasQuery();
  const [create, creating] = useCreateRollerGroupMutation();
  const [name, setName] = useState('');
  const [sector, setSector] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const group = await create({ name: name.trim(), sector }).unwrap();
      setName('');
      onCreated(group.id);
    } catch (cause) {
      setError(readError(cause) ?? t('sheet.saveFailed'));
    }
  }

  return (
    <Card title={t('catalogue.newGroup')} description={t('catalogue.newGroupHint')}>
      <div className="space-y-3">
        <FormField label={t('catalogue.groupName')}>
          <TextInput
            value={name}
            placeholder={t('catalogue.groupNameHint')}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label={t('catalogue.sector')}>
          <Select value={sector || ''} onChange={(event) => setSector(Number(event.target.value))}>
            <option value="">—</option>
            {areas.data?.results.map((area) => (
              <optgroup key={area.id} label={area.name}>
                {area.sectors.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FormField>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <Button
          variant="primary"
          disabled={!name.trim() || !sector || creating.isLoading}
          onClick={() => void submit()}
        >
          + {t('catalogue.createGroup')}
        </Button>
      </div>
    </Card>
  );
}

function GroupRollers({ group, canManage }: { group: RollerGroup; canManage: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const rollers = useRollersQuery(group.id);
  const [rename] = useRenameRollerGroupMutation();
  const [removeGroup] = useDeleteRollerGroupMutation();
  const [name, setName] = useState(group.name);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(readError(cause) ?? t('sheet.saveFailed'));
    }
  }

  const rows = rollers.data ?? [];
  return (
    <div className="space-y-4">
      <Card
        title={group.name}
        description={t('catalogue.groupHint', { sector: group.sector })}
        actions={
          canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-56"
                aria-label={t('catalogue.groupName')}
              />
              <Button
                disabled={!name.trim() || name.trim() === group.name}
                onClick={() => void run(() => rename({ id: group.id, name: name.trim() }).unwrap())}
              >
                {t('catalogue.rename')}
              </Button>
              {rows.length === 0 && (
                <Button variant="danger" onClick={() => void run(() => removeGroup(group.id).unwrap())}>
                  {t('common:action.delete')}
                </Button>
              )}
            </div>
          )
        }
        padded={false}
      >
        {error && <p className="m-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {rollers.isLoading ? (
          <div className="p-4">
            <Spinner label={t('common:state.loading')} />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('catalogue.noRollers')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="px-4 py-2">{t('catalogue.number')}</th>
                <th className="px-4 py-2">{t('catalogue.code')}</th>
                <th className="px-4 py-2 text-right">{t('catalogue.readings')}</th>
                <th className="px-4 py-2">{t('catalogue.status')}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((roller) => (
                <RollerRow key={roller.id} roller={roller} canManage={canManage} onError={setError} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {canManage && <AddRollers group={group} />}
    </div>
  );
}

function RollerRow({
  roller,
  canManage,
  onError,
}: {
  roller: RollerEntry;
  canManage: boolean;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const [setRetired, retiring] = useSetRollerRetiredMutation();
  const [remove, removing] = useDeleteRollerMutation();

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (cause) {
      onError(readError(cause) ?? t('sheet.saveFailed'));
    }
  }

  return (
    <tr className={clsx('border-b border-slate-100 dark:border-slate-800', roller.retired && 'text-slate-400')}>
      <td className="px-4 py-2 font-medium tabular-nums">{roller.number}</td>
      <td className="px-4 py-2">
        <span className="font-mono text-xs">{roller.code}</span>
        <span className="block text-xs text-slate-500">{roller.tag}</span>
      </td>
      <td className="px-4 py-2 text-right tabular-nums">{roller.readings}</td>
      <td className="px-4 py-2 text-xs">{roller.retired ? t('catalogue.retired') : t('catalogue.active')}</td>
      <td className="px-4 py-2 text-right">
        {canManage && (
          <div className="flex justify-end gap-2">
            <Button
              disabled={retiring.isLoading}
              onClick={() =>
                void run(() =>
                  setRetired({
                    id: roller.id,
                    retired: !roller.retired,
                  }).unwrap(),
                )
              }
            >
              {roller.retired ? t('catalogue.restore') : t('catalogue.retire')}
            </Button>
            {!roller.measured && (
              <Button
                variant="danger"
                disabled={removing.isLoading}
                onClick={() => void run(() => remove(roller.id).unwrap())}
              >
                {t('common:action.delete')}
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function AddRollers({ group }: { group: RollerGroup }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const [add, adding] = useAddRollersMutation();
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const numbers = parseNumbers(text);

  async function submit() {
    setMessage(null);
    try {
      const result = await add({ group: group.id, numbers }).unwrap();
      setMessage({
        ok: true,
        text: t('rollers.added', {
          created: result.created.length,
          skipped: result.skipped.length,
        }),
      });
      setText('');
    } catch (cause) {
      setMessage({
        ok: false,
        text: readError(cause) ?? t('sheet.saveFailed'),
      });
    }
  }

  return (
    <Card title={t('rollers.title')} description={t('rollers.hint')}>
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t('rollers.numbers')} hint={t('rollers.numbersHint', { count: numbers.length })}>
          <TextInput
            value={text}
            placeholder="1-28"
            onChange={(event) => setText(event.target.value)}
            className="w-56"
          />
        </FormField>
        <Button variant="primary" disabled={numbers.length === 0 || adding.isLoading} onClick={() => void submit()}>
          {t('rollers.add')}
        </Button>
      </div>
      {message && (
        <p
          className={`mt-3 rounded-lg p-2 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
