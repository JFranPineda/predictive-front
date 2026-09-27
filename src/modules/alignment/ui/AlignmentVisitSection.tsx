import type { VisitSectionProps } from '@app/moduleDefinition';

import { AlignmentPanel } from './AlignmentPanel';

/** The alignment of the visit's train, in place of the readings table (Q10). */
export default function AlignmentVisitSection({ visitId, assetGroupId, canEdit }: VisitSectionProps) {
  return <AlignmentPanel visitId={visitId} assetGroupId={assetGroupId} canEdit={canEdit} />;
}
