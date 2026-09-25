import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { addPoint, componentDrifts, layoutFor, rebuildComponent } from '../domain/templateLayout';
import {
  EQUIPMENT_TYPES,
  type AssetGroupKind,
  type KindComponent,
  type PointTemplateRow,
} from '../domain/types';
import {
  useCreateGroupKindMutation,
  useUpdateGroupKindMutation,
} from '../infrastructure/endpoints';
import { readKindError, readTemplateProblems, type TemplateProblem } from './kindErrors';
import { KindTemplateRows } from './KindTemplateRows';

const DEFAULT_COMPONENTS: KindComponent[] = [
  { label: 'MOTOR', equipment_type: 'motor', position: 'driver', point_count: 2 },
  { label: 'BOMBA', equipment_type: 'pump', position: 'driven', point_count: 2 },
];

export function KindFormModal({
  kind,
  onClose,
}: {
  kind?: AssetGroupKind;
  onClose: () => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const [create, creating] = useCreateGroupKindMutation();
  const [update, updating] = useUpdateGroupKindMutation();
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<TemplateProblem[]>([]);

  const [name, setName] = useState(kind?.name ?? '');
  const [description, setDescription] = useState(kind?.description ?? '');
  const [components, setComponents] = useState<KindComponent[]>(
    kind?.components.length ? kind.components : DEFAULT_COMPONENTS,
  );
  const [templates, setTemplates] = useState<PointTemplateRow[]>(
    kind?.point_templates.length ? kind.point_templates : layoutFor(components),
  );

  const busy = creating.isLoading || updating.isLoading;
  const drifts = componentDrifts(templates, components);
  const badRows = new Set(problems.flatMap((problem) => problem.rows));

  // The first offending row is usually far below the message; take the user
  // to it instead of making them hunt through seventy rows.
  useEffect(() => {
    const first = problems.flatMap((problem) => problem.rows)[0];
    if (first !== undefined) {
      document.getElementById(`template-row-${first}`)?.scrollIntoView({ block: 'center' });
    }
  }, [problems]);

  function editTemplates(next: PointTemplateRow[]) {
    setTemplates(next);
    setProblems([]);
  }

  async function submit() {
    setError(null);
    setProblems([]);
    const payload = { name, description, components, point_templates: templates };
    try {
      if (kind) await update({ ...payload, id: kind.id }).unwrap();
      else await create(payload).unwrap();
      onClose();
    } catch (cause) {
      setError(readKindError(cause) ?? t('form.genericError'));
      setProblems(readTemplateProblems(cause));
    }
  }

  return (
    <Modal
      title={kind ? t('kinds.edit') : t('kinds.new')}
      description={t('kinds.formHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={busy || !name.trim()} onClick={() => void submit()}>
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && (
        <div className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {problems.length > 1 ? (
            <ul className="list-inside list-disc">
              {problems.map((problem) => (
                <li key={problem.message}>{problem.message}</li>
              ))}
            </ul>
          ) : (
            <p>{error}</p>
          )}
        </div>
      )}

      <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-950 dark:text-sky-200">
        {t('kinds.whenNewKind')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.name')}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Motor-Turbina"
          />
        </FormField>
        <FormField label={t('form.description')}>
          <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
        </FormField>
      </div>

      <FormField label={t('kinds.components')} hint={t('kinds.componentsHint')}>
        <div className="space-y-2">
          {components.map((component, index) => (
            <ComponentRow
              key={index}
              component={component}
              onChange={(changes) => setComponents(patch(components, index, changes))}
              onRemove={() => setComponents(components.filter((_, p) => p !== index))}
            />
          ))}
          <Button
            onClick={() =>
              setComponents([
                ...components,
                { label: '', equipment_type: 'pump', position: 'driven', point_count: 2 },
              ])
            }
          >
            + {t('kinds.addComponent')}
          </Button>
        </div>
      </FormField>

      {drifts.map((drift) => (
        <div
          key={drift.label}
          className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <span className="flex-1">{t('kinds.drift', { ...drift })}</span>
          <Button onClick={() => editTemplates(rebuildComponent(templates, components, drift.label))}>
            {t('kinds.rebuildComponent', { label: drift.label })}
          </Button>
        </div>
      ))}

      <FormField label={t('kinds.layout')} hint={t('kinds.layoutHint')}>
        <div className="space-y-2">
          <KindTemplateRows
            templates={templates}
            components={components}
            badRows={badRows}
            onChange={editTemplates}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => editTemplates(addPoint(templates, components))}>
              + {t('kinds.addPoint')}
            </Button>
            {/* Typing thirty rows by hand to move a gearbox from two points to
                four is how a layout ends up wrong. */}
            <Button variant="ghost" onClick={() => editTemplates(layoutFor(components))}>
              {t('kinds.rebuildLayout')}
            </Button>
          </div>
        </div>
      </FormField>
    </Modal>
  );
}

function ComponentRow({
  component,
  onChange,
  onRemove,
}: {
  component: KindComponent;
  onChange: (changes: Partial<KindComponent>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('assets');
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_5rem_2rem] gap-2">
      <TextInput
        value={component.label}
        placeholder="MOTOR"
        onChange={(event) => onChange({ label: event.target.value })}
      />
      <Select
        value={component.equipment_type}
        onChange={(event) => onChange({ equipment_type: event.target.value })}
      >
        {EQUIPMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`type.${type}`)}
          </option>
        ))}
        <option value="turbine">{t('type.turbine')}</option>
      </Select>
      <Select value={component.position} onChange={(event) => onChange({ position: event.target.value })}>
        <option value="driver">{t('kinds.driver')}</option>
        <option value="driven">{t('kinds.driven')}</option>
        <option value="intermediate">{t('kinds.intermediate')}</option>
      </Select>
      <TextInput
        type="number"
        min={1}
        value={String(component.point_count)}
        aria-label={t('kinds.pointCount')}
        title={t('kinds.pointCountHint')}
        onChange={(event) => onChange({ point_count: Number(event.target.value) || 1 })}
      />
      <Button variant="ghost" onClick={onRemove}>
        ✕
      </Button>
    </div>
  );
}

function patch<T>(rows: T[], index: number, changes: Partial<T>): T[] {
  return rows.map((row, position) => (position === index ? { ...row, ...changes } : row));
}
