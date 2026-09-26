import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAssetGroupsQuery, usePlantsQuery } from '@modules/assets';
import { usePermissions } from '@app/hooks';
import { currentLocale } from '@app/i18n';
import { formatDate, formatDateTime } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import {
  apiError,
  minutesBetween,
  todayIso,
  type DayWork,
  type WorkdayDetail,
} from '../domain/types';
import {
  useAddObservationMutation,
  useCloseWorkdayMutation,
  useOpenWorkdayMutation,
  useRegisterPermitMutation,
  useReopenWorkdayMutation,
  useWorkdayQuery,
  useWorkdaysQuery,
} from '../infrastructure/endpoints';

export default function WorkdayPage() {
  const { t } = useTranslation(['workday', 'common']);
  const permissions = usePermissions();
  const plants = usePlantsQuery();
  const [plant, setPlant] = useState(0);
  const [date, setDate] = useState(todayIso);
  const plantId = plant || plants.data?.[0]?.id || 0;
  const days = useWorkdaysQuery({ plant: plantId, date }, { skip: !plantId });
  const day = days.data?.[0];
  const detail = useWorkdayQuery(day?.id ?? 0, { skip: !day });
  const [open, opening] = useOpenWorkdayMutation();
  const [error, setError] = useState<string | null>(null);
  const isToday = date === todayIso();
  const manages = permissions.has('workday.manage');

  async function openDay() {
    setError(null);
    try {
      await open({ plant: plantId }).unwrap();
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Page>
      <PageHeader title={t('title')} description={t('hint')}>
        <div className="flex flex-wrap gap-3">
          {(plants.data?.length ?? 0) > 1 && (
            <Select value={plantId} onChange={(event) => setPlant(Number(event.target.value))} className="w-64">
              {plants.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          )}
          <div className="w-48">
            <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>
      </PageHeader>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {days.isLoading || detail.isLoading ? (
        <Spinner label={t('common:loading')} />
      ) : !day ? (
        <EmptyState
          title={t('noDay', { date: formatDate(`${date}T12:00:00`) })}
          body={isToday ? t('noDayHint') : undefined}
          action={
            isToday && manages ? (
              <Button variant="primary" disabled={opening.isLoading} onClick={() => void openDay()}>
                {t('open')}
              </Button>
            ) : undefined
          }
        />
      ) : detail.data ? (
        <DayView day={detail.data} editable={day.is_open && isToday} />
      ) : null}
    </Page>
  );
}

function DayView({ day, editable }: { day: WorkdayDetail; editable: boolean }) {
  const { t } = useTranslation(['workday', 'common']);
  const permissions = usePermissions();
  const [signing, setSigning] = useState<'close' | 'reopen' | null>(null);
  const manages = permissions.has('workday.manage');
  const registers = manages || permissions.has('workday.register_permit');

  return (
    <div className="space-y-4">
      <Card
        title={t('dayOf', { plant: day.plant.name, date: formatDate(`${day.date}T12:00:00`) })}
        actions={
          manages ? (
            day.is_open ? (
              <Button variant="primary" onClick={() => setSigning('close')}>
                {t('close')}
              </Button>
            ) : (
              <Button onClick={() => setSigning('reopen')}>{t('reopen')}</Button>
            )
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={
              day.is_open
                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }
          >
            {day.is_open ? t('stateOpen') : t('stateClosed')}
          </span>
          <span className="text-slate-500">
            {t('openedBy', { who: day.opened_by, when: formatDateTime(day.opened_at) })}
          </span>
          {day.closed_at && (
            <span className="text-slate-500">
              {t('closedBy', { who: day.closed_by, when: formatDateTime(day.closed_at) })}
            </span>
          )}
        </div>
        {!day.is_open && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {t('lockedHint')}
          </p>
        )}
        {day.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{day.notes}</p>}
      </Card>

      <WorksCard works={day.works} />
      {day.permits !== null && <PermitsCard day={day} canRegister={registers && editable} />}
      <ObservationsCard day={day} canAdd={registers && editable} />

      {signing && <SignModal day={day} mode={signing} onClose={() => setSigning(null)} />}
    </div>
  );
}

function WorksCard({ works }: { works: DayWork[] }) {
  const { t } = useTranslation('workday');
  return (
    <Card title={t('works.title')} description={t('works.hint')} padded={false}>
      {works.length === 0 ? (
        <p className="p-4 text-sm text-slate-400">{t('works.empty')}</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">{t('works.start')}</th>
                <th className="px-3 py-2">{t('works.end')}</th>
                <th className="px-3 py-2">{t('works.service')}</th>
                <th className="px-3 py-2">{t('works.order')}</th>
                <th className="px-3 py-2">{t('works.group')}</th>
                <th className="px-3 py-2">{t('works.people')}</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work) => (
                <tr key={`${work.kind}-${work.id}`} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">{time(work.started_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {time(work.ended_at)}
                    {minutesBetween(work.started_at, work.ended_at) !== null && (
                      <span className="text-xs text-slate-400">
                        {' '}
                        ({minutesBetween(work.started_at, work.ended_at)} min)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {work.kind === 'maintenance' && (
                      <span className="mr-1 rounded bg-amber-100 px-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {t('works.corrective')}
                      </span>
                    )}
                    {work.service}
                  </td>
                  <td className="px-3 py-2">{work.order || '—'}</td>
                  <td className="px-3 py-2">
                    {work.group}
                    {work.equipment && <span className="text-slate-400"> · {work.equipment}</span>}
                  </td>
                  <td className="px-3 py-2">{work.people.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PermitsCard({ day, canRegister }: { day: WorkdayDetail; canRegister: boolean }) {
  const { t } = useTranslation('workday');
  const groups = useAssetGroupsQuery();
  const [register, { isLoading }] = useRegisterPermitMutation();
  const [group, setGroup] = useState(0);
  const [number, setNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const body = new FormData();
    body.append('asset_group', String(group));
    body.append('number', number.trim());
    if (file) body.append('file', file);
    try {
      await register({ id: day.id, body }).unwrap();
      setNumber('');
      setFile(null);
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Card title={t('permits.title')} description={t('permits.hint')}>
      {(day.permits ?? []).length === 0 ? (
        <p className="text-sm text-slate-400">{t('permits.empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {day.permits?.map((permit) => (
            <li key={permit.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium">{permit.number}</span>
              <span>{permit.asset_group.name}</span>
              <span className="text-xs text-slate-400">
                {permit.created_by} · {formatDateTime(permit.created_at)}
              </span>
              {permit.document_url && (
                <a className="text-xs text-sky-700 underline dark:text-sky-400" href={permit.document_url} target="_blank" rel="noreferrer">
                  {t('permits.document')}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {canRegister && (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 dark:border-slate-800">
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-3">{error}</p>}
          <FormField label={t('form.group')}>
            <GroupSelect groups={groups.data} value={group} onChange={setGroup} />
          </FormField>
          <FormField label={t('permits.number')}>
            <TextInput value={number} onChange={(event) => setNumber(event.target.value)} placeholder="ATS-0457" />
          </FormField>
          <FormField label={t('permits.signedCopy')}>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="block text-sm"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </FormField>
          <div className="sm:col-span-3">
            <Button variant="primary" disabled={isLoading || !group || !number.trim() || !file} onClick={() => void submit()}>
              {t('permits.register')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ObservationsCard({ day, canAdd }: { day: WorkdayDetail; canAdd: boolean }) {
  const { t } = useTranslation('workday');
  const groups = useAssetGroupsQuery();
  const [add, { isLoading }] = useAddObservationMutation();
  const [group, setGroup] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const body = new FormData();
    body.append('asset_group', String(group));
    if (photo) body.append('photo', photo);
    if (visible !== null) body.append('visible', String(visible));
    body.append('text', text.trim());
    try {
      await add({ id: day.id, body }).unwrap();
      setPhoto(null);
      setVisible(null);
      setText('');
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Card title={t('observations.title')} description={t('observations.hint')}>
      {day.observations.length === 0 ? (
        <p className="text-sm text-slate-400">{t('observations.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {day.observations.map((row) => (
            <li key={row.id} className="flex gap-3 text-sm">
              {row.photo_thumb && (
                <a href={row.photo_url ?? undefined} target="_blank" rel="noreferrer">
                  <img src={row.photo_thumb} alt="" className="h-16 w-16 rounded object-cover" />
                </a>
              )}
              <div>
                <p className="font-medium">
                  {row.asset_group.name}
                  <span
                    className={
                      row.visible
                        ? 'ml-2 rounded bg-emerald-100 px-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'ml-2 rounded bg-slate-200 px-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    {row.visible ? t('observations.visible') : t('observations.notVisible')}
                  </span>
                </p>
                <p>{row.text}</p>
                <p className="text-xs text-slate-400">
                  {row.created_by} · {formatDateTime(row.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
          <FormField label={t('form.group')}>
            <GroupSelect groups={groups.data} value={group} onChange={setGroup} />
          </FormField>
          <FormField label={t('observations.photo')} hint={t('observations.photoHint')}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="block text-sm"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
          </FormField>
          {/* Not a FormField: that is a <label>, and radios nested in a label
              all toggle the first one. */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('observations.isVisible')}</span>
            <div className="flex gap-4 pt-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={visible === true} disabled={!photo} onChange={() => setVisible(true)} />
                {t('observations.visible')}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={visible === false} disabled={!photo} onChange={() => setVisible(false)} />
                {t('observations.notVisible')}
              </label>
            </div>
          </div>
          <FormField label={t('observations.text')}>
            <TextArea
              rows={2}
              value={text}
              disabled={!photo || visible === null}
              placeholder={t('observations.textPlaceholder')}
              onChange={(event) => setText(event.target.value)}
            />
          </FormField>
          <div className="sm:col-span-2">
            <Button
              variant="primary"
              disabled={isLoading || !group || !photo || visible === null || !text.trim()}
              onClick={() => void submit()}
            >
              {t('observations.add')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SignModal({ day, mode, onClose }: { day: WorkdayDetail; mode: 'close' | 'reopen'; onClose: () => void }) {
  const { t } = useTranslation(['workday', 'common']);
  const [close, closing] = useCloseWorkdayMutation();
  const [reopen, reopening] = useReopenWorkdayMutation();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = closing.isLoading || reopening.isLoading;

  async function submit() {
    setError(null);
    try {
      if (mode === 'close') await close({ id: day.id, password }).unwrap();
      else await reopen({ id: day.id, password, reason: reason.trim() }).unwrap();
      onClose();
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Modal
      title={mode === 'close' ? t('sign.closeTitle') : t('sign.reopenTitle')}
      description={mode === 'close' ? t('sign.closeHint') : t('sign.reopenHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={busy || !password || (mode === 'reopen' && !reason.trim())}
            onClick={() => void submit()}
          >
            {mode === 'close' ? t('close') : t('reopen')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {mode === 'reopen' && (
        <FormField label={t('sign.reason')}>
          <TextArea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
        </FormField>
      )}
      <FormField label={t('sign.password')}>
        <TextInput
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>
    </Modal>
  );
}

function GroupSelect({
  groups,
  value,
  onChange,
}: {
  groups: { id: number; name: string }[] | undefined;
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <Select value={value || ''} onChange={(event) => onChange(Number(event.target.value))}>
      <option value="">—</option>
      {groups?.map((row) => (
        <option key={row.id} value={row.id}>
          {row.name}
        </option>
      ))}
    </Select>
  );
}

function time(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(currentLocale(), { timeStyle: 'short' }).format(new Date(value));
}
