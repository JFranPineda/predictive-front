import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMagnitudesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import {
  EQUIPMENT_TYPES,
  POINT_AXES,
  POINT_SIDES,
  type AssetGroupKind,
  type KindComponent,
  type PointTemplateRow,
} from '../domain/types';
import {
  useCreateGroupKindMutation,
  useUpdateGroupKindMutation,
} from '../infrastructure/endpoints';
import { readKindError } from './GroupKindsPage';

export function KindFormModal({
  kind,
  onClose,
}: {
  kind?: AssetGroupKind;
  onClose: () => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const magnitudes = useMagnitudesQuery();
  const [create, creating] = useCreateGroupKindMutation();
  const [update, updating] = useUpdateGroupKindMutation();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(kind?.name ?? '');
  const [description, setDescription] = useState(kind?.description ?? '');
  const [components, setComponents] = useState<KindComponent[]>(
    kind?.components.length
      ? kind.components
      : [
          { label: 'MOTOR', equipment_type: 'motor', position: 'driver' },
          { label: 'BOMBA', equipment_type: 'pump', position: 'driven' },
        ],
  );
  const [templates, setTemplates] = useState<PointTemplateRow[]>(
    kind?.point_templates ?? defaultLayout(),
  );

  const busy = creating.isLoading || updating.isLoading;

  async function submit() {
    setError(null);
    const payload = { name, description, components, point_templates: templates };
    try {
      if (kind) await update({ ...payload, id: kind.id }).unwrap();
      else await create(payload).unwrap();
      onClose();
    } catch (cause) {
      setError(readKindError(cause) ?? t('form.genericError'));
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
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.name')}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Motor-Turbina"
          />
        </FormField>
        <FormField label={t('form.description')}>
          <TextInput
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label={t('kinds.components')} hint={t('kinds.componentsHint')}>
        <div className="space-y-2">
          {components.map((component, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
              <TextInput
                value={component.label}
                placeholder="MOTOR"
                onChange={(event) =>
                  setComponents(patch(components, index, { label: event.target.value }))
                }
              />
              <Select
                value={component.equipment_type}
                onChange={(event) =>
                  setComponents(patch(components, index, { equipment_type: event.target.value }))
                }
              >
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`type.${type}`)}
                  </option>
                ))}
                <option value="turbine">{t('type.turbine')}</option>
              </Select>
              <Select
                value={component.position}
                onChange={(event) =>
                  setComponents(patch(components, index, { position: event.target.value }))
                }
              >
                <option value="driver">{t('kinds.driver')}</option>
                <option value="driven">{t('kinds.driven')}</option>
                <option value="intermediate">{t('kinds.intermediate')}</option>
              </Select>
              <Button
                variant="ghost"
                onClick={() => setComponents(components.filter((_, p) => p !== index))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            onClick={() =>
              setComponents([
                ...components,
                { label: '', equipment_type: 'pump', position: 'driven' },
              ])
            }
          >
            + {t('kinds.addComponent')}
          </Button>
        </div>
      </FormField>

      <FormField label={t('kinds.layout')} hint={t('kinds.layoutHint')}>
        <div className="space-y-2">
          <div className="grid grid-cols-[4rem_1fr_1fr_1fr_1.5fr_2rem] gap-2 text-[11px] uppercase tracking-wide text-slate-400">
            <span>{t('kinds.column.point')}</span>
            <span>{t('kinds.column.axis')}</span>
            <span>{t('kinds.column.component')}</span>
            <span>{t('kinds.column.side')}</span>
            <span>{t('kinds.column.magnitudes')}</span>
            <span />
          </div>
          {templates.map((row, index) => (
            <div key={index} className="grid grid-cols-[4rem_1fr_1fr_1fr_1.5fr_2rem] gap-2">
              <TextInput
                type="number"
                min={1}
                value={row.number}
                onChange={(event) =>
                  setTemplates(patch(templates, index, { number: Number(event.target.value) }))
                }
              />
              <Select
                value={row.axis}
                onChange={(event) =>
                  setTemplates(patch(templates, index, { axis: event.target.value }))
                }
              >
                {POINT_AXES.map((axis) => (
                  <option key={axis} value={axis}>
                    {axis}
                  </option>
                ))}
              </Select>
              <Select
                value={row.component_label ?? ''}
                onChange={(event) =>
                  setTemplates(patch(templates, index, { component_label: event.target.value }))
                }
              >
                <option value="">—</option>
                {components.map((component) => (
                  <option key={component.label} value={component.label}>
                    {component.label}
                  </option>
                ))}
              </Select>
              <Select
                value={row.side}
                onChange={(event) =>
                  setTemplates(patch(templates, index, { side: event.target.value }))
                }
              >
                {POINT_SIDES.map((side) => (
                  <option key={side} value={side}>
                    {t(`side.${side}`, { defaultValue: side })}
                  </option>
                ))}
              </Select>
              <Select
                multiple
                value={row.magnitudes}
                onChange={(event) =>
                  setTemplates(
                    patch(templates, index, {
                      magnitudes: Array.from(event.target.selectedOptions).map((o) => o.value),
                    }),
                  )
                }
                className="h-16"
              >
                {magnitudes.data?.map((magnitude) => (
                  <option key={magnitude.code} value={magnitude.code}>
                    {magnitude.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                onClick={() => setTemplates(templates.filter((_, p) => p !== index))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            onClick={() =>
              setTemplates([
                ...templates,
                {
                  number: (templates.at(-1)?.number ?? 0) + 1,
                  axis: 'H',
                  side: 'custom',
                  point_type: 'bearing',
                  magnitudes: ['vel_rms'],
                  component_label: components[0]?.label,
                },
              ])
            }
          >
            + {t('kinds.addPoint')}
          </Button>
        </div>
      </FormField>
    </Modal>
  );
}

function patch<T>(rows: T[], index: number, changes: Partial<T>): T[] {
  return rows.map((row, position) => (position === index ? { ...row, ...changes } : row));
}

/** The layout of the customer's own vibration report. */
function defaultLayout(): PointTemplateRow[] {
  const axes: Record<string, string[]> = {
    H: ['vel_rms', 'env_accel', 'temp'],
    V: ['vel_rms'],
    A: ['vel_rms'],
  };
  const sides = [
    ['free_end', 'coupling_end'],
    ['coupling_end', 'opposite_coupling'],
  ];
  const labels = ['MOTOR', 'BOMBA'];
  return labels.flatMap((label, component) =>
    [0, 1].flatMap((offset) =>
      Object.entries(axes).map(([axis, magnitudes]) => ({
        number: 1 + component * 2 + offset,
        axis,
        side: sides[component]![offset]!,
        point_type: 'bearing',
        magnitudes,
        component_label: label,
      })),
    ),
  );
}
