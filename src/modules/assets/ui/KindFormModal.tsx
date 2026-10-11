import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirm, useToast } from '@shared/feedback/FeedbackProvider';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { componentDrifts, layoutFor, rebuildComponent, syncPointCounts } from '../domain/templateLayout';
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
  const confirm = useConfirm();
  const toast = useToast();
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
      document.querySelector(`[data-template-rows~="${first}"]`)?.scrollIntoView({ block: 'center' });
    }
  }, [problems]);

  function editTemplates(next: PointTemplateRow[], recount = false) {
    setTemplates(next);
    setProblems([]);
    if (recount) setComponents(syncPointCounts(components, next));
  }

  // The template names its component by label: renaming one without its
  // rows left them pointing at a component that no longer exists.
  function editComponent(index: number, changes: Partial<KindComponent>) {
    const before = components[index]!;
    setComponents(patch(components, index, changes));
    if (changes.label !== undefined && before.label) {
      setTemplates(
        templates.map((row) =>
          row.component_label === before.label ? { ...row, component_label: changes.label } : row,
        ),
      );
    }
  }

  async function regenerate() {
    const ok = await confirm({
      title: t('kinds.rebuildTitle'),
      body: t('kinds.rebuildBody'),
      confirmLabel: t('kinds.rebuildLayout'),
    });
    if (ok) editTemplates(layoutFor(components));
  }

  async function submit() {
    setError(null);
    setProblems([]);
    const payload = { name, description, components, point_templates: templates };
    try {
      if (kind) await update({ ...payload, id: kind.id }).unwrap();
      else await create(payload).unwrap();
      toast.success(t('common:feedback.saved'));
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
      size="xl"
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

      {!!kind?.group_count && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950 dark:text-sky-200">
          {t('kinds.sharedBy', { count: kind.group_count })}
        </p>
      )}

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

      <Section title={t('kinds.components')} hint={t('kinds.componentsHint')}>
        <div className="space-y-2">
          <div className={`grid ${COMPONENT_GRID} gap-2 text-[11px] uppercase tracking-wide text-slate-400`}>
            <span>{t('form.name')}</span>
            <span>{t('kinds.column.type')}</span>
            <span>{t('kinds.column.position')}</span>
            <span title={t('kinds.pointCountHint')}>{t('kinds.pointCount')}</span>
            <span />
          </div>
          {components.map((component, index) => (
            <ComponentRow
              key={index}
              component={component}
              onChange={(changes) => editComponent(index, changes)}
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
      </Section>

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

      <Section
        title={t('kinds.layout')}
        hint={t('kinds.layoutHint')}
        action={
          // Typing thirty rows by hand to move a gearbox from two points to
          // four is how a layout ends up wrong.
          <Button variant="ghost" className="text-xs" onClick={() => void regenerate()}>
            ↺ {t('kinds.rebuildLayout')}
          </Button>
        }
      >
        <KindTemplateRows
          templates={templates}
          components={components}
          badRows={badRows}
          onChange={editTemplates}
        />
      </Section>
    </Modal>
  );
}

// Not a <label>: a label holding buttons clicks the first of them whenever its
// empty space is clicked.
function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const COMPONENT_GRID = 'grid-cols-[1.2fr_1fr_1fr_5rem_2rem]';

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
    <div className={`grid ${COMPONENT_GRID} gap-2`}>
      <TextInput
        value={component.label}
        placeholder="MOTOR"
        aria-label={t('form.name')}
        onChange={(event) => onChange({ label: event.target.value })}
      />
      <Select
        value={component.equipment_type}
        aria-label={t('kinds.column.type')}
        onChange={(event) => onChange({ equipment_type: event.target.value })}
      >
        {EQUIPMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`type.${type}`)}
          </option>
        ))}
        <option value="turbine">{t('type.turbine')}</option>
      </Select>
      <Select value={component.position} aria-label={t('kinds.column.position')} onChange={(event) => onChange({ position: event.target.value })}>
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
      <Button variant="ghost" aria-label={t('kinds.removeComponent')} title={t('kinds.removeComponent')} onClick={onRemove}>
        ✕
      </Button>
    </div>
  );
}

function patch<T>(rows: T[], index: number, changes: Partial<T>): T[] {
  return rows.map((row, position) => (position === index ? { ...row, ...changes } : row));
}
