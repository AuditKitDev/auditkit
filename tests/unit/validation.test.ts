import { describe, it, expect } from 'vitest';
import { validateEventInput, isValidAction, isValidSeverity } from '../../packages/shared/src/validation.js';
import type { AuditEventInput } from '../../packages/shared/src/types.js';

function validEvent(overrides: Partial<AuditEventInput> = {}): AuditEventInput {
  return {
    action: 'document.created',
    actor: { id: 'usr_1', name: 'Alice' },
    ...overrides,
  };
}

// ───────────────────────────────────────────
// validateEventInput
// ───────────────────────────────────────────
describe('validateEventInput', () => {
  it('accepts a minimal valid event', () => {
    expect(validateEventInput(validEvent())).toEqual([]);
  });

  it('accepts a fully populated event', () => {
    const errors = validateEventInput({
      action: 'user.login',
      actor: { id: 'usr_1', type: 'user', name: 'Alice', email: 'a@b.com', metadata: { role: 'admin' } },
      target: { type: 'session', id: 'sess_1', name: 'Session', metadata: { device: 'mobile' } },
      severity: 'info',
      description: 'User logged in',
      category: 'auth',
      metadata: { ip: '1.2.3.4' },
      tags: ['auth', 'login'],
      occurredAt: new Date().toISOString(),
    });
    expect(errors).toEqual([]);
  });

  // Action
  it('rejects missing action', () => {
    const errors = validateEventInput({ action: '', actor: { id: '1' } } as AuditEventInput);
    expect(errors.some(e => e.field === 'action')).toBe(true);
  });

  it('rejects uppercase action', () => {
    const errors = validateEventInput(validEvent({ action: 'Document.Created' }));
    expect(errors.some(e => e.field === 'action')).toBe(true);
  });

  it('rejects action with spaces', () => {
    const errors = validateEventInput(validEvent({ action: 'document created' }));
    expect(errors.some(e => e.field === 'action')).toBe(true);
  });

  it('rejects action exceeding 256 chars', () => {
    const errors = validateEventInput(validEvent({ action: 'a'.repeat(257) }));
    expect(errors.some(e => e.field === 'action')).toBe(true);
  });

  it('accepts single-segment action', () => {
    expect(validateEventInput(validEvent({ action: 'login' }))).toEqual([]);
  });

  it('accepts multi-segment action', () => {
    expect(validateEventInput(validEvent({ action: 'user.role.updated' }))).toEqual([]);
  });

  it('accepts action with underscores', () => {
    expect(validateEventInput(validEvent({ action: 'api_key.rotated' }))).toEqual([]);
  });

  // Actor
  it('rejects missing actor', () => {
    const errors = validateEventInput({ action: 'test.event', actor: undefined } as unknown as AuditEventInput);
    expect(errors.some(e => e.field === 'actor')).toBe(true);
  });

  it('rejects missing actor.id', () => {
    const errors = validateEventInput(validEvent({ actor: { id: '' } }));
    expect(errors.some(e => e.field === 'actor.id')).toBe(true);
  });

  it('rejects actor.id exceeding 256 chars', () => {
    const errors = validateEventInput(validEvent({ actor: { id: 'x'.repeat(257) } }));
    expect(errors.some(e => e.field === 'actor.id')).toBe(true);
  });

  it('rejects invalid actor.type', () => {
    const errors = validateEventInput(validEvent({ actor: { id: '1', type: 'robot' as any } }));
    expect(errors.some(e => e.field === 'actor.type')).toBe(true);
  });

  it('accepts all valid actor types', () => {
    for (const type of ['user', 'api_key', 'system', 'service'] as const) {
      expect(validateEventInput(validEvent({ actor: { id: '1', type } }))).toEqual([]);
    }
  });

  it('rejects actor.name exceeding 256 chars', () => {
    const errors = validateEventInput(validEvent({ actor: { id: '1', name: 'n'.repeat(257) } }));
    expect(errors.some(e => e.field === 'actor.name')).toBe(true);
  });

  it('rejects actor.email exceeding 256 chars', () => {
    const errors = validateEventInput(validEvent({ actor: { id: '1', email: 'e'.repeat(257) } }));
    expect(errors.some(e => e.field === 'actor.email')).toBe(true);
  });

  it('rejects actor.metadata with >50 keys', () => {
    const metadata: Record<string, string> = {};
    for (let i = 0; i < 51; i++) metadata[`k${i}`] = 'v';
    const errors = validateEventInput(validEvent({ actor: { id: '1', metadata } }));
    expect(errors.some(e => e.field === 'actor.metadata')).toBe(true);
  });

  it('rejects actor.metadata exceeding 10KB', () => {
    const errors = validateEventInput(validEvent({ actor: { id: '1', metadata: { big: 'x'.repeat(11000) } } }));
    expect(errors.some(e => e.field === 'actor.metadata')).toBe(true);
  });

  // Severity
  it('rejects invalid severity', () => {
    const errors = validateEventInput(validEvent({ severity: 'danger' as any }));
    expect(errors.some(e => e.field === 'severity')).toBe(true);
  });

  it('accepts all valid severities', () => {
    for (const severity of ['info', 'warn', 'error', 'critical'] as const) {
      expect(validateEventInput(validEvent({ severity }))).toEqual([]);
    }
  });

  // Metadata
  it('rejects metadata with >50 keys', () => {
    const metadata: Record<string, string> = {};
    for (let i = 0; i < 51; i++) metadata[`k${i}`] = 'v';
    const errors = validateEventInput(validEvent({ metadata }));
    expect(errors.some(e => e.field === 'metadata')).toBe(true);
  });

  it('rejects metadata exceeding 10KB', () => {
    const errors = validateEventInput(validEvent({ metadata: { big: 'x'.repeat(11000) } }));
    expect(errors.some(e => e.field === 'metadata')).toBe(true);
  });

  // Tags
  it('rejects more than 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    const errors = validateEventInput(validEvent({ tags }));
    expect(errors.some(e => e.field === 'tags')).toBe(true);
  });

  it('rejects tag exceeding 128 chars', () => {
    const errors = validateEventInput(validEvent({ tags: ['t'.repeat(129)] }));
    expect(errors.some(e => e.field === 'tags')).toBe(true);
  });

  // Description
  it('rejects description exceeding 4096 chars', () => {
    const errors = validateEventInput(validEvent({ description: 'd'.repeat(4097) }));
    expect(errors.some(e => e.field === 'description')).toBe(true);
  });

  // Error message
  it('rejects errorMessage exceeding 10000 chars', () => {
    const errors = validateEventInput(validEvent({ errorMessage: 'e'.repeat(10001) }));
    expect(errors.some(e => e.field === 'errorMessage')).toBe(true);
  });

  // occurredAt
  it('rejects invalid occurredAt date', () => {
    const errors = validateEventInput(validEvent({ occurredAt: 'not-a-date' }));
    expect(errors.some(e => e.field === 'occurredAt')).toBe(true);
  });

  it('accepts valid occurredAt string', () => {
    expect(validateEventInput(validEvent({ occurredAt: '2025-01-15T10:30:00Z' }))).toEqual([]);
  });

  it('accepts Date object for occurredAt', () => {
    expect(validateEventInput(validEvent({ occurredAt: new Date() }))).toEqual([]);
  });

  // Target
  it('rejects target without type', () => {
    const errors = validateEventInput(validEvent({ target: { type: '', id: 'doc_1' } }));
    expect(errors.some(e => e.field === 'target.type')).toBe(true);
  });

  it('rejects target without id', () => {
    const errors = validateEventInput(validEvent({ target: { type: 'doc', id: '' } }));
    expect(errors.some(e => e.field === 'target.id')).toBe(true);
  });

  it('rejects target.type exceeding 256 chars', () => {
    const errors = validateEventInput(validEvent({ target: { type: 't'.repeat(257), id: '1' } }));
    expect(errors.some(e => e.field === 'target.type')).toBe(true);
  });

  it('rejects target.metadata exceeding 10KB', () => {
    const errors = validateEventInput(validEvent({ target: { type: 'doc', id: '1', metadata: { big: 'x'.repeat(11000) } } }));
    expect(errors.some(e => e.field === 'target.metadata')).toBe(true);
  });

  // Multiple errors
  it('returns multiple errors at once', () => {
    const errors = validateEventInput({
      action: '',
      actor: undefined,
    } as unknown as AuditEventInput);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ───────────────────────────────────────────
// isValidAction
// ───────────────────────────────────────────
describe('isValidAction', () => {
  it('accepts simple action', () => expect(isValidAction('login')).toBe(true));
  it('accepts dotted action', () => expect(isValidAction('document.created')).toBe(true));
  it('accepts underscored action', () => expect(isValidAction('api_key.rotated')).toBe(true));
  it('accepts triple segment', () => expect(isValidAction('user.role.updated')).toBe(true));
  it('rejects uppercase', () => expect(isValidAction('Document.Created')).toBe(false));
  it('rejects spaces', () => expect(isValidAction('document created')).toBe(false));
  it('rejects hyphens', () => expect(isValidAction('document-created')).toBe(false));
  it('rejects leading dot', () => expect(isValidAction('.document')).toBe(false));
  it('rejects trailing dot', () => expect(isValidAction('document.')).toBe(false));
  it('rejects empty string', () => expect(isValidAction('')).toBe(false));
  it('rejects action over 256 chars', () => expect(isValidAction('a'.repeat(257))).toBe(false));
});

// ───────────────────────────────────────────
// isValidSeverity
// ───────────────────────────────────────────
describe('isValidSeverity', () => {
  it('accepts info', () => expect(isValidSeverity('info')).toBe(true));
  it('accepts warn', () => expect(isValidSeverity('warn')).toBe(true));
  it('accepts error', () => expect(isValidSeverity('error')).toBe(true));
  it('accepts critical', () => expect(isValidSeverity('critical')).toBe(true));
  it('rejects warning', () => expect(isValidSeverity('warning')).toBe(false));
  it('rejects debug', () => expect(isValidSeverity('debug')).toBe(false));
  it('rejects empty', () => expect(isValidSeverity('')).toBe(false));
  it('rejects uppercase', () => expect(isValidSeverity('ERROR')).toBe(false));
});
