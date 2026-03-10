import { describe, it, expect } from 'vitest';
import { redactEvent, BUILT_IN_PATTERNS, type RedactionRule } from '../../apps/api/src/services/pii-redaction.js';

function makeRule(overrides: Partial<RedactionRule> = {}): RedactionRule {
  return {
    id: 'rule_1',
    projectId: 'proj_1',
    fieldPath: '*',
    pattern: BUILT_IN_PATTERNS.email,
    replacement: '[REDACTED]',
    enabled: true,
    ...overrides,
  };
}

describe('redactEvent', () => {
  it('redacts emails in all fields', () => {
    const event = { actor: { email: 'alice@example.com' }, metadata: { contact: 'bob@test.com' } };
    const result = redactEvent(event, [makeRule()]);
    expect(result.actor).toEqual({ email: '[REDACTED]' });
    expect((result.metadata as any).contact).toBe('[REDACTED]');
  });

  it('redacts IP addresses', () => {
    const rule = makeRule({ pattern: BUILT_IN_PATTERNS.ip_address });
    const event = { sourceIp: '192.168.1.100', metadata: { origin: 'from 10.0.0.1 today' } };
    const result = redactEvent(event, [rule]);
    expect(result.sourceIp).toBe('[REDACTED]');
    expect((result.metadata as any).origin).toBe('from [REDACTED] today');
  });

  it('redacts SSNs', () => {
    const rule = makeRule({ pattern: BUILT_IN_PATTERNS.ssn });
    const event = { metadata: { ssn: '123-45-6789' } };
    const result = redactEvent(event, [rule]);
    expect((result.metadata as any).ssn).toBe('[REDACTED]');
  });

  it('redacts credit card numbers', () => {
    const rule = makeRule({ pattern: BUILT_IN_PATTERNS.credit_card });
    const event = { metadata: { card: '4111111111111111' } };
    const result = redactEvent(event, [rule]);
    expect((result.metadata as any).card).toBe('[REDACTED]');
  });

  it('redacts phone numbers', () => {
    const rule = makeRule({ pattern: BUILT_IN_PATTERNS.phone });
    const event = { metadata: { phone: '555-123-4567' } };
    const result = redactEvent(event, [rule]);
    expect((result.metadata as any).phone).toBe('[REDACTED]');
  });

  it('applies field-path-specific rule', () => {
    const rule = makeRule({ fieldPath: 'actor.email' });
    const event = { actor: { email: 'alice@example.com', name: 'alice@example.com' } };
    const result = redactEvent(event, [rule]);
    expect((result.actor as any).email).toBe('[REDACTED]');
    // Name should NOT be redacted — rule targets actor.email only
    expect((result.actor as any).name).toBe('alice@example.com');
  });

  it('skips disabled rules', () => {
    const rule = makeRule({ enabled: false });
    const event = { actor: { email: 'alice@example.com' } };
    const result = redactEvent(event, [rule]);
    expect((result.actor as any).email).toBe('alice@example.com');
  });

  it('skips invalid regex patterns', () => {
    const rule = makeRule({ pattern: '[invalid(' });
    const event = { data: 'hello' };
    const result = redactEvent(event, [rule]);
    expect(result.data).toBe('hello');
  });

  it('skips overly long patterns (ReDoS protection)', () => {
    const rule = makeRule({ pattern: 'a'.repeat(501) });
    const event = { data: 'hello' };
    const result = redactEvent(event, [rule]);
    expect(result.data).toBe('hello');
  });

  it('handles arrays in event data', () => {
    const rule = makeRule();
    const event = { tags: ['alice@test.com', 'normal', 'bob@test.com'] };
    const result = redactEvent(event, [rule]);
    expect((result.tags as string[])[0]).toBe('[REDACTED]');
    expect((result.tags as string[])[1]).toBe('normal');
    expect((result.tags as string[])[2]).toBe('[REDACTED]');
  });

  it('handles nested objects recursively', () => {
    const rule = makeRule();
    const event = { level1: { level2: { level3: { email: 'deep@test.com' } } } };
    const result = redactEvent(event, [rule]);
    expect((result as any).level1.level2.level3.email).toBe('[REDACTED]');
  });

  it('does not modify original event', () => {
    const rule = makeRule();
    const event = { actor: { email: 'alice@example.com' } };
    redactEvent(event, [rule]);
    expect(event.actor.email).toBe('alice@example.com');
  });

  it('applies multiple rules', () => {
    const rules = [
      makeRule({ id: '1', pattern: BUILT_IN_PATTERNS.email }),
      makeRule({ id: '2', pattern: BUILT_IN_PATTERNS.ip_address }),
    ];
    const event = { email: 'a@b.com', ip: '10.0.0.1' };
    const result = redactEvent(event, rules);
    expect(result.email).toBe('[REDACTED]');
    expect(result.ip).toBe('[REDACTED]');
  });

  it('uses custom replacement text', () => {
    const rule = makeRule({ replacement: '***' });
    const event = { email: 'a@b.com' };
    const result = redactEvent(event, [rule]);
    expect(result.email).toBe('***');
  });

  it('preserves non-string values', () => {
    const rule = makeRule();
    const event = { count: 42, active: true, empty: null, email: 'a@b.com' };
    const result = redactEvent(event, [rule]);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.empty).toBe(null);
  });
});
