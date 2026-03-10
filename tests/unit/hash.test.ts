import { describe, it, expect } from 'vitest';
import { computeRowHash, verifyHash } from '../../packages/sdk/src/hash.js';
import type { HashableFields } from '../../packages/sdk/src/hash.js';

function makeEvent(overrides: Partial<HashableFields> = {}): HashableFields {
  return {
    id: 'evt_001',
    tenantId: 'tenant_abc',
    action: 'document.created',
    actorId: 'usr_1',
    targetType: 'document',
    targetId: 'doc_42',
    occurredAt: '2025-01-15T10:30:00Z',
    sourceIp: '192.168.1.1',
    metadata: { browser: 'Chrome' },
    ...overrides,
  };
}

describe('computeRowHash', () => {
  it('returns a 64-char hex SHA-256 hash', () => {
    const hash = computeRowHash(makeEvent(), null);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const event = makeEvent();
    expect(computeRowHash(event, null)).toBe(computeRowHash(event, null));
  });

  it('changes when any field changes', () => {
    const base = computeRowHash(makeEvent(), null);
    expect(computeRowHash(makeEvent({ action: 'document.deleted' }), null)).not.toBe(base);
    expect(computeRowHash(makeEvent({ actorId: 'usr_2' }), null)).not.toBe(base);
    expect(computeRowHash(makeEvent({ id: 'evt_002' }), null)).not.toBe(base);
    expect(computeRowHash(makeEvent({ tenantId: 'other' }), null)).not.toBe(base);
    expect(computeRowHash(makeEvent({ occurredAt: '2025-01-16T00:00:00Z' }), null)).not.toBe(base);
  });

  it('changes when prevHash changes', () => {
    const event = makeEvent();
    const h1 = computeRowHash(event, null);
    const h2 = computeRowHash(event, 'abc123');
    expect(h1).not.toBe(h2);
  });

  it('handles null targetType and targetId', () => {
    const hash = computeRowHash(makeEvent({ targetType: null, targetId: null }), null);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles null sourceIp', () => {
    const hash = computeRowHash(makeEvent({ sourceIp: null }), null);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('canonicalizes metadata (key order irrelevant)', () => {
    const h1 = computeRowHash(makeEvent({ metadata: { a: 1, b: 2 } }), null);
    const h2 = computeRowHash(makeEvent({ metadata: { b: 2, a: 1 } }), null);
    expect(h1).toBe(h2);
  });

  it('different metadata values produce different hashes', () => {
    const h1 = computeRowHash(makeEvent({ metadata: { x: 1 } }), null);
    const h2 = computeRowHash(makeEvent({ metadata: { x: 2 } }), null);
    expect(h1).not.toBe(h2);
  });

  it('uses GENESIS when prevHash is null', () => {
    const h1 = computeRowHash(makeEvent(), null);
    const h2 = computeRowHash(makeEvent(), 'GENESIS');
    // These should NOT be equal since GENESIS is embedded differently
    // null -> joins 'GENESIS', but an actual prevHash of 'GENESIS' also joins 'GENESIS'
    // Actually, looking at the code: prevHash ?? 'GENESIS' — so null maps to 'GENESIS'
    // and an actual 'GENESIS' string also maps to 'GENESIS'. So they should be equal.
    expect(h1).toBe(h2);
  });
});

describe('verifyHash', () => {
  it('returns true for correct hash', () => {
    const event = makeEvent();
    const hash = computeRowHash(event, null);
    expect(verifyHash(event, null, hash)).toBe(true);
  });

  it('returns false for tampered data', () => {
    const event = makeEvent();
    const hash = computeRowHash(event, null);
    const tampered = makeEvent({ action: 'document.deleted' });
    expect(verifyHash(tampered, null, hash)).toBe(false);
  });

  it('returns false for wrong prevHash', () => {
    const event = makeEvent();
    const hash = computeRowHash(event, 'hash_A');
    expect(verifyHash(event, 'hash_B', hash)).toBe(false);
  });

  it('verifies chain linking', () => {
    const evt1 = makeEvent({ id: 'evt_001' });
    const hash1 = computeRowHash(evt1, null);

    const evt2 = makeEvent({ id: 'evt_002', action: 'document.updated' });
    const hash2 = computeRowHash(evt2, hash1);

    expect(verifyHash(evt1, null, hash1)).toBe(true);
    expect(verifyHash(evt2, hash1, hash2)).toBe(true);
    // Breaking chain
    expect(verifyHash(evt2, null, hash2)).toBe(false);
  });
});
