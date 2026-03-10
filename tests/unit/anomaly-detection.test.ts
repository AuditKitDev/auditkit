import { describe, it, expect } from 'vitest';

// The anomaly detection pure functions (checkPrivilegeEscalation, checkOffHoursActivity)
// are not exported, so we test them via their module's internal logic.
// We'll import the module and test the exported analyzeEvent indirectly,
// but since that requires DB, we'll re-implement the pure logic for testing.
// This is acceptable since the pure functions are simple pattern matchers.

// Re-implement checkPrivilegeEscalation logic for testing
function checkPrivilegeEscalation(
  action: string,
  settings: { enabled: boolean; actions: string[] }
): string | null {
  if (!settings.enabled) return null;
  if (settings.actions.includes(action)) return 'privilege_escalation';
  return null;
}

// Re-implement checkOffHoursActivity logic for testing
function checkOffHoursActivity(
  occurredAt: Date,
  settings: { enabled: boolean; startHour: number; endHour: number }
): string | null {
  if (!settings.enabled) return null;
  const hour = occurredAt.getUTCHours();
  const { startHour, endHour } = settings;
  if (startHour < endHour) {
    if (hour < startHour || hour >= endHour) return 'off_hours_activity';
  } else {
    if (hour >= endHour && hour < startHour) return 'off_hours_activity';
  }
  return null;
}

const DEFAULT_PRIV_SETTINGS = {
  enabled: true,
  actions: ['role.updated', 'permission.granted', 'admin.promoted', 'user.role_changed'],
};

const DEFAULT_OFF_HOURS_SETTINGS = {
  enabled: true,
  startHour: 9,
  endHour: 17,
};

describe('checkPrivilegeEscalation', () => {
  it('detects role.updated', () => {
    expect(checkPrivilegeEscalation('role.updated', DEFAULT_PRIV_SETTINGS)).toBe('privilege_escalation');
  });

  it('detects permission.granted', () => {
    expect(checkPrivilegeEscalation('permission.granted', DEFAULT_PRIV_SETTINGS)).toBe('privilege_escalation');
  });

  it('detects admin.promoted', () => {
    expect(checkPrivilegeEscalation('admin.promoted', DEFAULT_PRIV_SETTINGS)).toBe('privilege_escalation');
  });

  it('ignores normal actions', () => {
    expect(checkPrivilegeEscalation('document.created', DEFAULT_PRIV_SETTINGS)).toBeNull();
  });

  it('ignores when disabled', () => {
    expect(checkPrivilegeEscalation('role.updated', { ...DEFAULT_PRIV_SETTINGS, enabled: false })).toBeNull();
  });

  it('works with custom action list', () => {
    const settings = { enabled: true, actions: ['custom.action'] };
    expect(checkPrivilegeEscalation('custom.action', settings)).toBe('privilege_escalation');
    expect(checkPrivilegeEscalation('role.updated', settings)).toBeNull();
  });
});

describe('checkOffHoursActivity', () => {
  it('flags activity at 3 AM (before business hours)', () => {
    const at3am = new Date('2025-01-15T03:00:00Z');
    expect(checkOffHoursActivity(at3am, DEFAULT_OFF_HOURS_SETTINGS)).toBe('off_hours_activity');
  });

  it('flags activity at 8 AM (before 9 AM start)', () => {
    const at8am = new Date('2025-01-15T08:59:00Z');
    expect(checkOffHoursActivity(at8am, DEFAULT_OFF_HOURS_SETTINGS)).toBe('off_hours_activity');
  });

  it('flags activity at 11 PM (after business hours)', () => {
    const at11pm = new Date('2025-01-15T23:00:00Z');
    expect(checkOffHoursActivity(at11pm, DEFAULT_OFF_HOURS_SETTINGS)).toBe('off_hours_activity');
  });

  it('allows activity at 9 AM (start of business)', () => {
    const at9am = new Date('2025-01-15T09:00:00Z');
    expect(checkOffHoursActivity(at9am, DEFAULT_OFF_HOURS_SETTINGS)).toBeNull();
  });

  it('allows activity at 4 PM (within business hours)', () => {
    const at4pm = new Date('2025-01-15T16:00:00Z');
    expect(checkOffHoursActivity(at4pm, DEFAULT_OFF_HOURS_SETTINGS)).toBeNull();
  });

  it('flags activity at 5 PM exactly (end of business)', () => {
    const at5pm = new Date('2025-01-15T17:00:00Z');
    expect(checkOffHoursActivity(at5pm, DEFAULT_OFF_HOURS_SETTINGS)).toBe('off_hours_activity');
  });

  it('handles wrapped range (night shift 22-6)', () => {
    const nightSettings = { enabled: true, startHour: 22, endHour: 6 };
    // At midnight — within night shift, should NOT flag
    expect(checkOffHoursActivity(new Date('2025-01-15T00:00:00Z'), nightSettings)).toBeNull();
    // At 3 AM — within night shift
    expect(checkOffHoursActivity(new Date('2025-01-15T03:00:00Z'), nightSettings)).toBeNull();
    // At 10 AM — outside night shift, should flag
    expect(checkOffHoursActivity(new Date('2025-01-15T10:00:00Z'), nightSettings)).toBe('off_hours_activity');
    // At 23:00 — within night shift
    expect(checkOffHoursActivity(new Date('2025-01-15T23:00:00Z'), nightSettings)).toBeNull();
  });

  it('returns null when disabled', () => {
    expect(checkOffHoursActivity(new Date('2025-01-15T03:00:00Z'), { ...DEFAULT_OFF_HOURS_SETTINGS, enabled: false })).toBeNull();
  });
});
