import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';


import {
  useAreasQuery,
  useAssetGroupsQuery,
  useCreateAreaMutation,
  useCreateAssetGroupMutation,
  useCreatePlantMutation,
  useCreateSectorMutation,
  useDeleteAreaMutation,
  useGroupKindsQuery,
  useDeleteAssetGroupMutation,
  usePlantsQuery,
} from '../infrastructure/endpoints';
import { readApiError } from './EquipmentFormModal';
import { GroupPointsModal } from './GroupPointsModal';

/**
 * Where the plant is built: plant → area → sector → machine train.
 *
 * Levels are created top-down on purpose — each form only offers parents that
 * already exist, so it is impossible to end up with an orphan.
 */
export default function PlantStructurePage() {
  const { t } = useTranslation(['assets', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('assets.manage_equipment');
  const plants = usePlantsQuery();
  const areas = useAreasQuery();
  const groups = useAssetGroupsQuery();
  const [error, setError] = useState<string | null>(null);

  if (plants.isLoading || areas.isLoading) return <Spinner label={t('loading')} />;

  return (
    <Page>
      <PageHeader title={t('structure.title')} description={t('structure.subtitle')} />

      {error && <ErrorState title={error} />}
      {plants.isError && (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('structure.plants')} description={t('structure.plantsHint')}>
          <ul className="mb-4 space-y-1.5">
            {plants.data?.map((plant) => (
              <li key={plant.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{plant.name}</span>
                <span className="font-mono text-xs text-slate-400">{plant.code}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {t('structure.areaCount', { count: plant.area_count })}
                </span>
              </li>
            ))}
          </ul>
          {canManage && <PlantForm onError={setError} />}
        </Card>

        <Card title={t('structure.areas')} description={t('structure.areasHint')}>
          <ul className="mb-4 max-h-64 space-y-1.5 overflow-y-auto">
            {areas.data?.results.map((area) => (
              <AreaRow key={area.id} area={area} canManage={canManage} onError={setError} />
            ))}
          </ul>
          {canManage && <AreaForm plants={plants.data ?? []} onError={setError} />}
        </Card>

        <Card title={t('structure.sectors')} description={t('structure.sectorsHint')} >
          {canManage ? (
            <SectorForm areas={areas.data?.results ?? []} onError={setError} />
          ) : (
            <EmptyState title={t('structure.readOnly')} />
          )}
        </Card>

        <Card title={t('structure.groups')} description={t('structure.groupsHint')}>
          <ul className="mb-4 max-h-64 space-y-1.5 overflow-y-auto">
            {groups.data?.slice(0, 40).map((group) => (
              <GroupRow key={group.id} group={group} canManage={canManage} onError={setError} />
            ))}
          </ul>
          {canManage && <GroupForm onError={setError} />}
        </Card>
      </div>
    </Page>
  );
}

function PlantForm({ onError }: { onError: (message: string | null) => void }) {
  const { t } = useTranslation(['assets', 'common']);
  const [create, { isLoading }] = useCreatePlantMutation();
  const [name, setName] = useState('');

  return (
    <InlineForm
      disabled={isLoading || !name.trim()}
      onSubmit={async () => {
        onError(null);
        try {
          await create({ name }).unwrap();
          setName('');
        } catch (cause) {
          onError(readApiError(cause) ?? t('form.genericError'));
        }
      }}
    >
      <FormField label={t('structure.plantName')}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Planta Huachipa" />
      </FormField>
    </InlineForm>
  );
}

function AreaForm({
  plants,
  onError,
}: {
  plants: { id: number; name: string }[];
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const [create, { isLoading }] = useCreateAreaMutation();
  const [draft, setDraft] = useState({ plant: 0, code: '', name: '' });

  return (
    <InlineForm
      disabled={isLoading || !draft.plant || !draft.code.trim() || !draft.name.trim()}
      onSubmit={async () => {
        onError(null);
        try {
          await create(draft).unwrap();
          setDraft({ plant: draft.plant, code: '', name: '' });
        } catch (cause) {
          onError(readApiError(cause) ?? t('form.genericError'));
        }
      }}
    >
      <FormField label={t('structure.plant')}>
        <Select
          value={draft.plant || ''}
          onChange={(e) => setDraft({ ...draft, plant: Number(e.target.value) })}
        >
          <option value="">—</option>
          {plants.map((plant) => (
            <option key={plant.id} value={plant.id}>
              {plant.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <FormField label={t('structure.code')}>
          <TextInput
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            placeholder="501"
          />
        </FormField>
        <FormField label={t('structure.name')}>
          <TextInput
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="PACKAGING CERVEZA"
          />
        </FormField>
      </div>
    </InlineForm>
  );
}

function SectorForm({
  areas,
  onError,
}: {
  areas: { id: number; code: string; name: string }[];
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const [create, { isLoading }] = useCreateSectorMutation();
  const [draft, setDraft] = useState({ area: 0, name: '' });

  return (
    <InlineForm
      disabled={isLoading || !draft.area || !draft.name.trim()}
      onSubmit={async () => {
        onError(null);
        try {
          await create(draft).unwrap();
          setDraft({ area: draft.area, name: '' });
        } catch (cause) {
          onError(readApiError(cause) ?? t('form.genericError'));
        }
      }}
    >
      <FormField label={t('structure.area')}>
        <Select
          value={draft.area || ''}
          onChange={(e) => setDraft({ ...draft, area: Number(e.target.value) })}
        >
          <option value="">—</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.code} — {area.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('structure.name')}>
        <TextInput
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="KIT BOMBAS AGUA CRUDA"
        />
      </FormField>
    </InlineForm>
  );
}

function GroupForm({ onError }: { onError: (message: string | null) => void }) {
  const { t } = useTranslation(['assets', 'common']);
  const areas = useAreasQuery();
  const [create, { isLoading }] = useCreateAssetGroupMutation();
  const kinds = useGroupKindsQuery();
  const [draft, setDraft] = useState({ sector: 0, name: '', kind: 0 });
  const sectors = (areas.data?.results ?? []).flatMap((area) =>
    area.sectors.map((sector) => ({ ...sector, area: area.code })),
  );

  return (
    <InlineForm
      disabled={isLoading || !draft.sector || !draft.name.trim()}
      onSubmit={async () => {
        onError(null);
        try {
          await create(draft).unwrap();
          setDraft({ ...draft, name: '' });
        } catch (cause) {
          onError(readApiError(cause) ?? t('form.genericError'));
        }
      }}
    >
      <FormField label={t('structure.sector')}>
        <Select
          value={draft.sector || ''}
          onChange={(e) => setDraft({ ...draft, sector: Number(e.target.value) })}
        >
          <option value="">—</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.area} · {sector.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-2">
        <FormField label={t('structure.name')}>
          <TextInput
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="BBA. AGUA CRUDA - TAG:A"
          />
        </FormField>
        <FormField label={t('structure.kind')} hint={t('structure.kindHint')}>
          <Select
            value={draft.kind || ''}
            onChange={(e) => setDraft({ ...draft, kind: Number(e.target.value) })}
          >
            <option value="">—</option>
            {kinds.data?.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      {sectors.length === 0 && (
        <p className="text-xs text-amber-600">{t('structure.noSectors')}</p>
      )}
    </InlineForm>
  );
}

function AreaRow({
  area,
  canManage,
  onError,
}: {
  area: { id: number; code: string; name: string; equipment_count: number };
  canManage: boolean;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const [remove] = useDeleteAreaMutation();
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="font-mono text-xs text-slate-400">{area.code}</span>
      <span>{area.name}</span>
      <span className="ml-auto text-xs text-slate-500">
        {t('structure.equipmentCount', { count: area.equipment_count })}
      </span>
      {canManage && (
        <Button
          variant="ghost"
          onClick={async () => {
            onError(null);
            try {
              await remove(area.id).unwrap();
            } catch (cause) {
              onError(readApiError(cause) ?? t('form.genericError'));
            }
          }}
        >
          ✕
        </Button>
      )}
    </li>
  );
}

function GroupRow({
  group,
  canManage,
  onError,
}: {
  group: {
    id: number;
    name: string;
    area_code: string;
    equipment_count: number;
    point_count?: number;
    kind_name?: string;
  };
  canManage: boolean;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const [remove] = useDeleteAssetGroupMutation();
  const [editingPoints, setEditingPoints] = useState(false);
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="font-mono text-xs text-slate-400">{group.area_code}</span>
      <span className="truncate">{group.name}</span>
      {group.kind_name && (
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">
          {group.kind_name}
        </span>
      )}
      <span className="ml-auto shrink-0 text-xs text-slate-500">
        {t('structure.pointCount', { count: group.point_count ?? 0 })}
      </span>
      <Button variant="ghost" onClick={() => setEditingPoints(true)}>
        {t('structure.editPoints')}
      </Button>
      {editingPoints && (
        <GroupPointsModal
          groupId={group.id}
          groupName={group.name}
          onClose={() => setEditingPoints(false)}
        />
      )}
      {canManage && (
        <Button
          variant="ghost"
          onClick={async () => {
            onError(null);
            try {
              await remove(group.id).unwrap();
            } catch (cause) {
              onError(readApiError(cause) ?? t('form.genericError'));
            }
          }}
        >
          ✕
        </Button>
      )}
    </li>
  );
}

function InlineForm({
  children,
  disabled,
  onSubmit,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onSubmit: () => Promise<void>;
}) {
  const { t } = useTranslation(['common']);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
    >
      {children}
      <Button type="submit" variant="primary" disabled={disabled}>
        + {t('action.add')}
      </Button>
    </form>
  );
}
