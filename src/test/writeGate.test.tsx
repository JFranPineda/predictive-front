import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import en from '@app/i18n/locales/en/common.json';
import es from '@app/i18n/locales/es/common.json';
import { Button } from '@shared/ui/Button';
import { WriteGate } from '@shared/ui/writeGate';

const READ_ONLY = { readOnly: true, lapsed: false, reason: 'Licencia vencida: el sistema está en solo lectura' };
const LAPSED = { readOnly: true, lapsed: true, reason: 'La suscripción venció: puedes consultar y exportar…' };

function inGate(gate: typeof READ_ONLY, button: React.ReactNode) {
  return render(<WriteGate.Provider value={gate}>{button}</WriteGate.Provider>);
}

describe('buttons when the licence takes writing away (v4 Phase 4)', () => {
  it('a save or delete button is disabled and says why', () => {
    inGate(READ_ONLY, <Button variant="primary">Guardar</Button>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', READ_ONLY.reason);
  });

  it('a delete button too', () => {
    inGate(READ_ONLY, <Button variant="danger">Borrar</Button>);
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeDisabled();
  });

  it('a secondary button (cancel, filters) keeps working', () => {
    inGate(READ_ONLY, <Button>Cancelar</Button>);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });

  it('a primary button that does not write opts out', () => {
    inGate(LAPSED, <Button variant="primary" gate="none">Cargar licencia</Button>);
    expect(screen.getByRole('button', { name: 'Cargar licencia' })).toBeEnabled();
  });

  it('a report button works in the grace period and stops once the subscription lapses', () => {
    const { unmount } = inGate(READ_ONLY, <Button variant="primary" gate="report">PDF</Button>);
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
    unmount();
    inGate(LAPSED, <Button variant="primary" gate="report">PDF</Button>);
    expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
  });

  it('without a licence in context nothing is gated', () => {
    render(<Button variant="primary">Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('an explicitly disabled button stays disabled', () => {
    render(<Button variant="primary" disabled>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});

describe('the licence notice', () => {
  it('speaks both languages', () => {
    for (const key of ['readOnly', 'lapsed', 'export', 'see'] as const) {
      expect(es.licence[key], `es: licence.${key}`).toBeTruthy();
      expect(en.licence[key], `en: licence.${key}`).toBeTruthy();
    }
  });
});
