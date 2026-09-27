import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { usePermissions } from '@app/hooks';
import { currentLocale } from '@app/i18n';
import { formatDate, formatDateTime } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { ErrorState } from '@shared/ui/ErrorState';
import { FormField, TextArea, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import {
  apiError,
  blankStep,
  draftOf,
  itemNumbers,
  type AtsDraft,
  type AtsStep,
  type IpercLevel,
  type JobSignature,
  type RiskCategory,
  type ServiceJob,
} from '../domain/types';
import {
  useAddCrewMutation,
  useCloseJobMutation,
  useDeleteJobMutation,
  useJobQuery,
  useRemoveCrewMutation,
  useSignJobMutation,
  useUnlockJobMutation,
  useUpdateJobMutation,
} from '../infrastructure/endpoints';
import { SignaturePad } from './SignaturePad';

const RISKS: { code: RiskCategory; tone: string }[] = [
  { code: 'high', tone: 'bg-red-600 text-white border-red-600' },
  { code: 'medium', tone: 'bg-yellow-400 text-slate-900 border-yellow-400' },
  { code: 'low', tone: 'bg-green-600 text-white border-green-600' },
];

const LEVELS: { code: IpercLevel; head: string; cell: string }[] = [
  { code: 'A', head: 'bg-red-600 text-white', cell: 'bg-red-50 dark:bg-red-950/40' },
  { code: 'M', head: 'bg-yellow-400 text-slate-900', cell: 'bg-yellow-50 dark:bg-yellow-950/40' },
  { code: 'B', head: 'bg-green-600 text-white', cell: 'bg-green-50 dark:bg-green-950/40' },
];

/**
 * One service of the day (Q17, Q19): the three signatures that open the
 * train's fields, the ATS in the client's own format, the crew who sign it,
 * and the chief engineer's close that sets the final hour.
 */
export default function JobPage() {
  const { t } = useTranslation(['workday', 'common']);
  const { jobId } = useParams();
  const { data: job, isLoading, isError } = useJobQuery(Number(jobId));
  const permissions = usePermissions();

  if (isLoading) return <Spinner label={t('common:loading')} />;
  if (isError || !job) {
    return (
      <Page>
        <ErrorState title={t('job.notFound')} body={t('job.notFoundBody')} />
      </Page>
    );
  }

  const registers = permissions.has('workday.manage') || permissions.has('workday.register_permit');
  const editable = registers && job.status !== 'closed' && job.workday.is_open;

  return (
    <Page>
      <PageHeader
        title={`${job.asset_group.name} · ${job.activity || job.service_order?.technique || t('job.untitled')}`}
        description={t('job.subtitle', {
          date: formatDate(`${job.workday.date}T12:00:00`),
          order: job.service_order ? `${job.service_order.code} (${job.service_order.technique})` : t('job.noOrder'),
        })}
        actions={
          <Link to="/workday" className="text-sm text-sky-700 underline dark:text-sky-400">
            {t('job.back')}
          </Link>
        }
      />
      <StatusBanner job={job} />
      <StartSignatures job={job} editable={editable} canUnlock={permissions.has('workday.unlock_service')} />
      <AtsForm key={job.id} job={job} editable={editable} />
      <Crew job={job} editable={editable} />
      <Closing job={job} canClose={permissions.has('workday.close_service')} canDelete={editable} />
    </Page>
  );
}

function StatusBanner({ job }: { job: ServiceJob }) {
  const { t } = useTranslation('workday');
  const tone =
    job.status === 'closed'
      ? 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
      : job.status === 'in_progress'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200';
  return (
    <div className={clsx('flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm', tone)}>
      <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-black/20">
        {t(`job.status.${job.status}`)}
      </span>
      <span>
        {job.status === 'pending_start' && t('job.pendingHint', { signed: job.start_signed.length })}
        {job.status === 'in_progress' && t('job.inProgressHint', { time: clock(job.started_at) })}
        {job.status === 'closed' &&
          t('job.closedHint', { start: clock(job.started_at), end: clock(job.closed_at), who: job.closed_by })}
      </span>
    </div>
  );
}

function StartSignatures({ job, editable, canUnlock }: { job: ServiceJob; editable: boolean; canUnlock: boolean }) {
  const { t } = useTranslation('workday');
  const [signing, setSigning] = useState<JobSignature | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const started = job.started_at !== null;

  return (
    <Card
      title={t('job.startTitle')}
      description={t('job.startHint')}
      actions={
        canUnlock &&
        editable &&
        !started && (
          <Button onClick={() => setUnlocking(true)}>{t('job.unlock')}</Button>
        )
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {job.start_signatures.map((slot) => (
          <SignatureSlot
            key={slot.role}
            slot={slot}
            onSign={editable && !started ? () => setSigning(slot) : undefined}
          />
        ))}
      </div>
      {job.unlock && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t('job.unlockedBy', { who: job.unlock.by, when: formatDateTime(job.unlock.at), reason: job.unlock.reason })}
        </p>
      )}
      {signing && <SignModal job={job} slot={signing} onClose={() => setSigning(null)} />}
      {unlocking && <UnlockModal job={job} onClose={() => setUnlocking(false)} />}
    </Card>
  );
}

function SignatureSlot({ slot, onSign }: { slot: JobSignature; onSign?: () => void }) {
  const { t } = useTranslation('workday');
  return (
    <div
      className={clsx(
        'flex flex-col rounded-xl border p-4',
        slot.signed_at
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-dashed border-slate-300 dark:border-slate-700',
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{slot.label}</span>
      {slot.signed_at ? (
        <>
          {slot.image_url && (
            <img src={slot.image_url} alt={t('job.signatureOf', { name: slot.name })} className="my-2 h-16 object-contain" />
          )}
          <span className="font-medium">{slot.name}</span>
          {slot.position && <span className="text-xs text-slate-500">{slot.position}</span>}
          <span className="mt-1 text-xs text-slate-400">{formatDateTime(slot.signed_at)}</span>
        </>
      ) : (
        <div className="mt-3 flex flex-1 flex-col items-start justify-between gap-3">
          <span className="text-sm text-slate-400">{t('job.unsigned')}</span>
          {onSign && (
            <Button variant="primary" onClick={onSign}>
              {t('job.sign')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SignModal({ job, slot, onClose }: { job: ServiceJob; slot: JobSignature; onClose: () => void }) {
  const { t } = useTranslation(['workday', 'common']);
  const [sign, { isLoading }] = useSignJobMutation();
  const crew = slot.role === 'crew';
  const [name, setName] = useState(slot.name);
  const [position, setPosition] = useState(slot.position);
  const [drawing, setDrawing] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!drawing) return;
    setError(null);
    const body = new FormData();
    body.append('role', slot.role);
    if (crew && slot.id) body.append('signature', String(slot.id));
    else {
      body.append('name', name.trim());
      body.append('position', position.trim());
    }
    body.append('image', drawing, 'firma.png');
    try {
      await sign({ id: job.id, body }).unwrap();
      onClose();
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Modal
      title={t('job.signTitle', { role: slot.label })}
      description={crew ? t('job.signCrewHint', { name: slot.name }) : t('job.signHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={isLoading || !drawing || (!crew && !name.trim())}
            onClick={() => void submit()}
          >
            {t('job.confirmSignature')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!crew && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('job.signerName')}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label={t('job.signerPosition')}>
            <TextInput value={position} onChange={(event) => setPosition(event.target.value)} />
          </FormField>
        </div>
      )}
      <SignaturePad onChange={setDrawing} />
    </Modal>
  );
}

function UnlockModal({ job, onClose }: { job: ServiceJob; onClose: () => void }) {
  const { t } = useTranslation(['workday', 'common']);
  const [unlock, { isLoading }] = useUnlockJobMutation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await unlock({ id: job.id, reason: reason.trim() }).unwrap();
      onClose();
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Modal
      title={t('job.unlockTitle')}
      description={t('job.unlockHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={isLoading || !reason.trim()} onClick={() => void submit()}>
            {t('job.unlock')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <FormField label={t('job.unlockReason')}>
        <TextArea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
      </FormField>
    </Modal>
  );
}

function AtsForm({ job, editable }: { job: ServiceJob; editable: boolean }) {
  const { t } = useTranslation(['workday', 'common']);
  const [update, { isLoading }] = useUpdateJobMutation();
  const [draft, setDraft] = useState<AtsDraft>(() => draftOf(job));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const original = JSON.stringify(draftOf(job));
  const dirty = JSON.stringify(draft) !== original;
  const items = itemNumbers(draft.steps);

  // A signature or a crew change refetches the job: keep what is being typed.
  const [seen, setSeen] = useState(original);
  if (seen !== original) {
    setSeen(original);
    if (!dirty) setDraft(draftOf(job));
  }

  function set<K extends keyof AtsDraft>(key: K, value: AtsDraft[K]) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setStep(index: number, change: Partial<AtsStep>) {
    set(
      'steps',
      draft.steps.map((row, position) => (position === index ? { ...row, ...change } : row)),
    );
  }

  function insertAfter(index: number) {
    const steps = [...draft.steps];
    steps.splice(index + 1, 0, blankStep(draft.steps[index]?.step ?? ''));
    set('steps', steps);
  }

  async function save() {
    setError(null);
    try {
      await update({ id: job.id, ...draft }).unwrap();
      setSaved(true);
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  const cell = 'border border-slate-300 dark:border-slate-700';
  const input =
    'w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-sky-50 disabled:cursor-default dark:focus:bg-slate-800';

  return (
    <Card
      title={t('ats.title')}
      description={t('ats.hint')}
      actions={
        editable && (
          <Button variant="primary" disabled={!dirty || isLoading} onClick={() => void save()}>
            {dirty ? t('ats.save') : saved ? t('ats.saved') : t('ats.upToDate')}
          </Button>
        )
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <tbody>
            <tr>
              <th className={clsx(cell, 'w-56 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>
                {t('ats.holder')}
              </th>
              <td className={cell}>
                <input className={input} disabled={!editable} value={draft.holder} onChange={(e) => set('holder', e.target.value)} />
              </td>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1.5 text-center text-xs font-semibold dark:bg-slate-800')} colSpan={2}>
                {t('ats.activity')}
              </th>
            </tr>
            <tr>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>{t('ats.unit')}</th>
              <td className={cell}>
                <input className={input} disabled={!editable} value={draft.unit} onChange={(e) => set('unit', e.target.value)} />
              </td>
              <td className={cell} colSpan={2} rowSpan={3}>
                <textarea
                  className={clsx(input, 'h-full min-h-[6rem] resize-none text-center font-medium text-red-700 dark:text-red-400')}
                  disabled={!editable}
                  value={draft.activity}
                  onChange={(e) => set('activity', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>{t('ats.area')}</th>
              <td className={cell}>
                <input className={input} disabled={!editable} value={draft.area} onChange={(e) => set('area', e.target.value)} />
              </td>
            </tr>
            <tr>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>{t('ats.zone')}</th>
              <td className={cell}>
                <input className={input} disabled={!editable} value={draft.zone} onChange={(e) => set('zone', e.target.value)} />
              </td>
            </tr>
            <tr>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>
                {t('ats.riskCategory')}
              </th>
              <td className={cell} colSpan={3}>
                <div className="flex flex-wrap gap-2 p-2">
                  {RISKS.map((risk) => {
                    const on = draft.risk_category === risk.code;
                    return (
                      <button
                        key={risk.code}
                        type="button"
                        disabled={!editable}
                        aria-pressed={on}
                        onClick={() => set('risk_category', on ? '' : risk.code)}
                        className={clsx(
                          'inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-semibold transition',
                          on ? risk.tone : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300',
                        )}
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-current text-[10px]">
                          {on ? '✕' : ''}
                        </span>
                        {t(`ats.risk.${risk.code}`)}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
            <tr>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>{t('ats.ppe')}</th>
              <td className={cell}>
                <textarea
                  rows={3}
                  className={clsx(input, 'resize-y')}
                  disabled={!editable}
                  value={draft.ppe}
                  placeholder={t('ats.ppePlaceholder')}
                  onChange={(e) => set('ppe', e.target.value)}
                />
              </td>
              <th className={clsx(cell, 'w-44 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold dark:bg-slate-800')}>
                {t('ats.tools')}
              </th>
              <td className={cell}>
                <textarea
                  rows={3}
                  className={clsx(input, 'resize-y')}
                  disabled={!editable}
                  value={draft.tools}
                  placeholder={t('ats.toolsPlaceholder')}
                  onChange={(e) => set('tools', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <table className="mt-4 w-full min-w-[52rem] table-fixed border-collapse text-sm">
          {/* Fixed layout reads widths from here: the IPERC header spans three
              columns, so the first row alone cannot size them. */}
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-12" />
            <col className="w-12" />
            <col className="w-12" />
            <col className="w-[20%]" />
            {editable && <col className="w-20" />}
          </colgroup>
          <thead>
            <tr className="text-xs font-semibold uppercase">
              <th className={clsx(cell, 'w-12 bg-slate-50 px-2 py-2 dark:bg-slate-800')} rowSpan={2}>{t('ats.item')}</th>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-2 dark:bg-slate-800')} rowSpan={2}>{t('ats.step')}</th>
              <th className={clsx(cell, 'w-[15%] bg-slate-50 px-2 py-2 dark:bg-slate-800')} rowSpan={2}>{t('ats.hazard')}</th>
              <th className={clsx(cell, 'w-[15%] bg-slate-50 px-2 py-2 dark:bg-slate-800')} rowSpan={2}>{t('ats.risk.title')}</th>
              <th className={clsx(cell, 'bg-slate-50 px-2 py-1 dark:bg-slate-800')} colSpan={3}>{t('ats.iperc')}</th>
              <th className={clsx(cell, 'w-[20%] bg-slate-50 px-2 py-2 dark:bg-slate-800')} rowSpan={2}>{t('ats.controls')}</th>
              {editable && <th className={clsx(cell, 'w-20 bg-slate-50 dark:bg-slate-800')} rowSpan={2} />}
            </tr>
            <tr>
              {LEVELS.map((level) => (
                <th key={level.code} className={clsx(cell, 'w-12 py-1 text-xs', level.head)}>
                  {level.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.steps.map((row, index) => {
              const continues = index > 0 && items[index] === items[index - 1];
              return (
                <tr key={index} className="align-top">
                  <td className={clsx(cell, 'text-center font-medium text-red-700 dark:text-red-400')}>
                    {continues ? '' : items[index]}
                  </td>
                  <td className={cell}>
                    <textarea
                      rows={2}
                      className={clsx(input, 'resize-y', continues && 'text-slate-400')}
                      disabled={!editable}
                      value={row.step}
                      placeholder={t('ats.stepPlaceholder')}
                      onChange={(e) => setStep(index, { step: e.target.value })}
                    />
                  </td>
                  <td className={cell}>
                    <textarea rows={2} className={clsx(input, 'resize-y')} disabled={!editable} value={row.hazard} onChange={(e) => setStep(index, { hazard: e.target.value })} />
                  </td>
                  <td className={cell}>
                    <textarea rows={2} className={clsx(input, 'resize-y')} disabled={!editable} value={row.risk} onChange={(e) => setStep(index, { risk: e.target.value })} />
                  </td>
                  {LEVELS.map((level) => {
                    const on = row.level === level.code;
                    return (
                      <td key={level.code} className={clsx(cell, 'p-1 text-center', on && level.cell)}>
                        {on ? (
                          <input
                            aria-label={t('ats.score', { level: level.code })}
                            inputMode="numeric"
                            className="w-full bg-transparent text-center text-sm font-semibold text-red-700 outline-none dark:text-red-400"
                            disabled={!editable}
                            value={row.score ?? ''}
                            onChange={(e) => setStep(index, { score: e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')) || 0 })}
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={!editable}
                            aria-label={t('ats.pickLevel', { level: level.code })}
                            className="h-7 w-full rounded text-xs text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setStep(index, { level: level.code })}
                          >
                            ·
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className={cell}>
                    <textarea rows={2} className={clsx(input, 'resize-y')} disabled={!editable} value={row.controls} onChange={(e) => setStep(index, { controls: e.target.value })} />
                  </td>
                  {editable && (
                    <td className={clsx(cell, 'space-y-1 p-1 text-center')}>
                      <button
                        type="button"
                        title={t('ats.addHazard')}
                        className="w-full rounded px-1 py-0.5 text-xs text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-slate-800"
                        onClick={() => insertAfter(index)}
                      >
                        {t('ats.addHazardShort')}
                      </button>
                      <button
                        type="button"
                        title={t('ats.removeRow')}
                        className="w-full rounded px-1 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                        onClick={() => set('steps', draft.steps.filter((_, position) => position !== index))}
                      >
                        {t('ats.removeRowShort')}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {draft.steps.length === 0 && (
              <tr>
                <td colSpan={editable ? 9 : 8} className={clsx(cell, 'px-3 py-4 text-center text-slate-400')}>
                  {t('ats.noSteps')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editable && (
        <div className="mt-3">
          <Button onClick={() => set('steps', [...draft.steps, blankStep()])}>+ {t('ats.addStep')}</Button>
        </div>
      )}
    </Card>
  );
}

function Crew({ job, editable }: { job: ServiceJob; editable: boolean }) {
  const { t } = useTranslation(['workday', 'common']);
  const [add, adding] = useAddCrewMutation();
  const [remove] = useRemoveCrewMutation();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [signing, setSigning] = useState<JobSignature | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await add({ id: job.id, name: name.trim(), position: position.trim() }).unwrap();
      setName('');
      setPosition('');
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  return (
    <Card title={t('crew.title')} description={t('crew.hint')} padded={false}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            <th className="px-4 py-2">{t('crew.name')}</th>
            <th className="px-4 py-2">{t('crew.position')}</th>
            <th className="px-4 py-2">{t('crew.signature')}</th>
            <th className="w-24 px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {job.crew.map((member) => (
            <tr key={member.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2 font-medium">{member.name}</td>
              <td className="px-4 py-2 text-slate-500">{member.position || '—'}</td>
              <td className="px-4 py-2">
                {member.signed_at ? (
                  <div className="flex items-center gap-3">
                    {member.image_url && <img src={member.image_url} alt="" className="h-10 w-28 object-contain" />}
                    <span className="text-xs text-slate-400">{formatDateTime(member.signed_at)}</span>
                  </div>
                ) : editable ? (
                  <Button onClick={() => setSigning(member)}>{t('job.sign')}</Button>
                ) : (
                  <span className="text-slate-400">{t('job.unsigned')}</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                {editable && member.id && (
                  <Button variant="ghost" onClick={() => void remove({ id: job.id, signatureId: member.id! })}>
                    {t('crew.remove')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {job.crew.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                {t('crew.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {editable && (
        <div className="flex flex-wrap items-end gap-3 p-4">
          {error && <p className="w-full rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <FormField label={t('crew.name')}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Juan Ramos Martínez" />
          </FormField>
          <FormField label={t('crew.position')}>
            <TextInput value={position} onChange={(event) => setPosition(event.target.value)} placeholder={t('crew.positionPlaceholder')} />
          </FormField>
          <Button disabled={adding.isLoading || !name.trim()} onClick={() => void submit()}>
            + {t('crew.add')}
          </Button>
        </div>
      )}
      {signing && <SignModal job={job} slot={signing} onClose={() => setSigning(null)} />}
    </Card>
  );
}

function Closing({ job, canClose, canDelete }: { job: ServiceJob; canClose: boolean; canDelete: boolean }) {
  const { t } = useTranslation(['workday', 'common']);
  const navigate = useNavigate();
  const [closeJob, closing] = useCloseJobMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await closeJob({ id: job.id, password }).unwrap();
      setOpen(false);
    } catch (cause) {
      setError(apiError(cause) ?? t('genericError'));
    }
  }

  if (job.status === 'closed') {
    return (
      <Card title={t('closing.title')}>
        <p className="text-sm">
          {t('closing.done', { end: formatDateTime(job.closed_at), who: job.closed_by })}
        </p>
      </Card>
    );
  }

  return (
    <Card
      title={t('closing.title')}
      description={t('closing.hint')}
      actions={
        <div className="flex gap-2">
          {canDelete && !job.started_at && (
            <Button
              variant="ghost"
              onClick={() => void deleteJob(job.id).unwrap().then(() => navigate('/workday'))}
            >
              {t('closing.delete')}
            </Button>
          )}
          {canClose && (
            <Button variant="primary" disabled={!job.can_close} onClick={() => setOpen(true)}>
              {t('closing.close')}
            </Button>
          )}
        </div>
      }
    >
      {!job.started_at ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('closing.notStarted')}</p>
      ) : job.missing.length > 0 ? (
        <div className="text-sm">
          <p className="mb-2 font-medium text-slate-700 dark:text-slate-200">{t('closing.missing')}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {job.missing.map((item) => (
              <li key={item} className="flex items-start gap-2 text-red-700 dark:text-red-400">
                <span aria-hidden>○</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {t('closing.ready')}</p>
      )}
      {open && (
        <Modal
          title={t('closing.modalTitle')}
          description={t('closing.modalHint')}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>{t('common:action.cancel')}</Button>
              <Button variant="primary" disabled={closing.isLoading || !password} onClick={() => void submit()}>
                {t('closing.close')}
              </Button>
            </>
          }
        >
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <FormField label={t('sign.password')}>
            <TextInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>
        </Modal>
      )}
    </Card>
  );
}

function clock(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(currentLocale(), { timeStyle: 'short' }).format(new Date(value));
}

