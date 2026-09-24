import { describe, expect, it } from 'vitest';

import { describeChange, type AuditEntry } from '@modules/users/domain/audit';
import {
  accessKindOf,
  byMatrixOrder,
  isFieldRole,
  validationOf,
  type RolePermissions,
} from '@modules/users/domain/roles';

const role = (code: string, name: string, base: RolePermissions['base_role'], permissions: string[] = []): RolePermissions => ({
  id: 0, code, name, is_system: false, base_role: base, description: '', member_count: 0, permissions,
});

describe('the plant access matrix', () => {
  it('reads each profile the way the customer drew it', () => {
    expect(accessKindOf('client_viewer', ['summaries.view'])).toBe('read');
    // Read only plus audit: the maintenance manager's row.
    expect(accessKindOf('planner', ['summaries.view', 'core.view_audit'])).toBe('read_audit');
    expect(accessKindOf('technician', ['measurements.add_reading'])).toBe('read_write');
    expect(validationOf('client_viewer')).toBe('corporate');
    expect(validationOf('technician')).toBe('personal_code');
  });

  it('never grants write access to a manager because of a ticked permission', () => {
    // The behaviour, not the checkbox, decides whether field data can change.
    expect(accessKindOf('client_viewer', ['measurements.add_reading'])).toBe('read');
    expect(isFieldRole('client_viewer')).toBe(false);
  });

  it('orders the profiles top-down, not alphabetically', () => {
    const ordered = [
      role('tecnico', 'Personal Técnico', 'technician', ['a']),
      role('sub', 'Subgerente de Planta', 'client_viewer', ['a', 'b', 'c']),
      role('jefe', 'Jefe de Mantenimiento', 'planner', ['a', 'b']),
      role('ger', 'Gerente General', 'client_viewer', ['a']),
    ].sort(byMatrixOrder);

    // The deputy holds more permissions than the general manager; the
    // hierarchy is not a permission count.
    expect(ordered.map((row) => row.name)).toEqual([
      'Gerente General', 'Subgerente de Planta', 'Jefe de Mantenimiento', 'Personal Técnico',
    ]);
  });
});

describe('audit lines', () => {
  const entry = (before: AuditEntry['before'], after: AuditEntry['after']): AuditEntry => ({
    id: 1, at: '', action: 'reading.corrected', object_type: 'reading', object_id: '9',
    actor: 'Ana', actor_initials: 'AQ', before, after, ip: null,
  });

  it('shows a correction as before and after, in the plant words', () => {
    const line = describeChange(
      entry({ value: '4.80', status: 'alarm' }, { value: '9.50', status: 'shutdown' }),
      (key) => ({ value: 'valor', status: 'estado' })[key] ?? key,
      (raw) => ({ alarm: 'Alarma', shutdown: 'Parada' })[raw] ?? raw,
    );

    expect(line).toBe('valor: 4.80 → 9.50 · estado: Alarma → Parada');
  });

  it('shows a value that only appeared, without an arrow', () => {
    expect(describeChange(entry(null, { readings: 3 }))).toBe('readings: 3');
  });
});
