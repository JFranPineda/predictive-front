import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { Button } from '@shared/ui/Button';

/**
 * One screen failing must not blank the whole application: the menu stays,
 * the person reads what happened and can retry or go elsewhere. Keyed by the
 * path, so navigating away clears it.
 */
export function ScreenErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('screen crashed', error, info.componentStack);
  }

  render() {
    return this.state.failed ? <Crashed onRetry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}

function Crashed({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('common');
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">{t('crash.title')}</h1>
      <p className="mt-2 text-sm text-slate-500">{t('crash.body')}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={onRetry}>{t('crash.retry')}</Button>
        <Button variant="primary" onClick={() => window.location.reload()}>
          {t('crash.reload')}
        </Button>
      </div>
    </div>
  );
}
