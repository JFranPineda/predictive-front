import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { i18n } from '@app/i18n';
import { applyTheme, readStoredTheme } from '@app/theme/theme';
import { AppRoutes } from '@app/router';
import { store } from '@app/store';
import { FeedbackProvider } from '@shared/feedback/FeedbackProvider';

import './index.css';

// Before the first paint: a flash of the wrong theme is the one bug users
// notice every single time.
applyTheme(readStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <BrowserRouter>
          <FeedbackProvider>
            <AppRoutes />
          </FeedbackProvider>
        </BrowserRouter>
      </Provider>
    </I18nextProvider>
  </StrictMode>,
);
