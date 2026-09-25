import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useEquipmentQuery } from '@modules/assets';
import { Spinner } from '@shared/ui/Spinner';

/**
 * Old links named a machine (`/measurements/47`); the record now belongs to
 * the train. The machine is kept as the selected scope, so a link from the
 * traffic light or a visit still lands on the same values.
 */
export function LegacyEquipmentRedirect({ suffix = '' }: { suffix?: string }) {
  const { t } = useTranslation('measurements');
  const { equipmentId } = useParams();
  const id = Number(equipmentId);
  const navigate = useNavigate();
  const { data, isError } = useEquipmentQuery(id);

  useEffect(() => {
    if (data) void navigate(`/measurements/groups/${data.asset_group.id}${suffix}?equipment=${id}`, { replace: true });
  }, [data, id, navigate, suffix]);

  if (isError) return <p className="p-8 text-sm text-slate-500">{t('record.notFound')}</p>;
  return <Spinner label={t('record.loading')} />;
}

export default function LegacyRecordRedirect() {
  return <LegacyEquipmentRedirect />;
}
