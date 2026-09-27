import { Navigate, useSearchParams } from 'react-router-dom';

/** `/reports?tab=end` from before the menu split still lands on its page. */
export default function LegacyReportsRedirect() {
  const [params] = useSearchParams();
  const family = params.get('tab') === 'end' ? 'end' : 'mpd';
  return <Navigate to={`/reports/${family}?${params.toString()}`} replace />;
}
