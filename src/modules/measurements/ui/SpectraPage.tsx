import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { groupByPoint } from '../domain/spectra';
import type { Spectrum } from '../domain/types';
import { useSpectraQuery } from '../infrastructure/endpoints';
import { SpectrumDetailModal } from './spectra/SpectrumDetailModal';
import { SpectrumTile } from './spectra/SpectrumTile';
import { SpectrumUploadCard } from './spectra/SpectrumUploadCard';

/**
 * The spectra of a whole train, point by point (V3-09).
 *
 * A spectrum of the pump imported from the motor used to vanish from the
 * motor's page; the train is the unit, and `?equipment=` narrows it to one
 * machine like the record of values does.
 */
export default function SpectraPage() {
  const { groupId } = useParams();
  const group = Number(groupId);
  const [params] = useSearchParams();
  const equipment = Number(params.get('equipment')) || undefined;
  const { t } = useTranslation(['measurements', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage =
    permissions.includes('vibration.diagnose') || permissions.includes('measurements.add_reading');
  const [cursor, setCursor] = useState<string | undefined>();
  const { data, isLoading, isFetching } = useSpectraQuery(
    equipment ? { equipment, cursor } : { group, cursor },
  );
  const [opened, setOpened] = useState<Spectrum | null>(null);

  if (isLoading) return <Spinner label={t('spectra.loading')} />;
  const points = groupByPoint(data?.items ?? []);

  return (
    <Page>
      <PageHeader title={t('spectra.title')} description={t('spectra.subtitle')} />
      {canManage && <SpectrumUploadCard group={group} />}

      {points.length === 0 ? (
        <Card>
          <EmptyState title={t('spectra.empty')} body={t('spectra.emptyHint')} />
        </Card>
      ) : (
        points.map((point) => (
          <section key={point.pointId} className="space-y-2">
            <h2 className="text-sm font-medium">
              {point.equipmentName} · <span className="font-mono">{point.label}</span>
            </h2>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {point.items.map((spectrum) => (
                <SpectrumTile key={spectrum.id} spectrum={spectrum} onOpen={() => setOpened(spectrum)} />
              ))}
            </ul>
          </section>
        ))
      )}

      {data?.next_cursor && (
        <Button disabled={isFetching} onClick={() => setCursor(data.next_cursor ?? undefined)}>
          {t('spectra.more')}
        </Button>
      )}

      {opened && (
        <SpectrumDetailModal spectrum={opened} canManage={canManage} onClose={() => setOpened(null)} />
      )}
    </Page>
  );
}
