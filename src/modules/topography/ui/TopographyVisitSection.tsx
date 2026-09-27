import type { VisitSectionProps } from '@app/moduleDefinition';

import { TopographyPanel } from './TopographyPanel';

/** The topography survey of the visit, in place of the readings table (Q11). */
export default function TopographyVisitSection({ visitId, assetGroupId, canEdit }: VisitSectionProps) {
  return <TopographyPanel visitId={visitId} assetGroupId={assetGroupId} canEdit={canEdit} />;
}
