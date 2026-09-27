import type { VisitSectionProps } from '@app/moduleDefinition';

import { ThermogramUploadCard } from './ThermogramUploadCard';

/** A thermography visit's upload, above its readings (V3-16, Q8). */
export default function ThermogramVisitSection({ visitId, equipmentId, canEdit }: VisitSectionProps) {
  return canEdit ? <ThermogramUploadCard visitId={visitId} equipmentId={equipmentId} /> : null;
}
