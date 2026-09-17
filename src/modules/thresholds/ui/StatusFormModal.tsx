import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { useCreateStatusMutation } from '../infrastructure/endpoints';
import { readError } from './StandardFormModal';

export function StatusFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [create, { isLoading }] = useCreateStatusMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    kind: 'condition',
    severity: 15,
    color: '#64748b',
    measurable: false,
    requires_action: false,
    is_terminal: false,
  });

  async function submit() {
    setError(null);
    try {
      await create(draft).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('form.newStatus')}
      description={t('form.statusHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={isLoading || !draft.name.trim()}
            onClick={() => void submit()}
          >
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.name')}>
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder={t('form.newStatus')}
          />
        </FormField>

        <FormField label={t('form.kind')}>
          <Select
            value={draft.kind}
            onChange={(event) => setDraft({ ...draft, kind: event.target.value })}
          >
            <option value="condition">{t('statuses.condition')}</option>
            <option value="availability">{t('statuses.availability')}</option>
          </Select>
        </FormField>

        <FormField label={t('form.severity')} hint={t('form.severityHint')}>
          <TextInput
            type="number"
            value={draft.severity}
            onChange={(event) => setDraft({ ...draft, severity: Number(event.target.value) })}
          />
        </FormField>

        <FormField label={t('form.color')}>
          <input
            type="color"
            value={draft.color}
            onChange={(event) => setDraft({ ...draft, color: event.target.value })}
            className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 bg-transparent dark:border-slate-700"
          />
        </FormField>
      </div>

      <div className="space-y-2 text-sm">
        {draft.kind === 'availability' && (
          <Checkbox
            label={t('form.measurable')}
            checked={draft.measurable}
            onChange={(measurable) => setDraft({ ...draft, measurable })}
          />
        )}
        {draft.kind === 'condition' && (
          <>
            <Checkbox
              label={t('form.requiresAction')}
              checked={draft.requires_action}
              onChange={(requires_action) => setDraft({ ...draft, requires_action })}
            />
            <Checkbox
              label={t('form.isTerminal')}
              checked={draft.is_terminal}
              onChange={(is_terminal) => setDraft({ ...draft, is_terminal })}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
