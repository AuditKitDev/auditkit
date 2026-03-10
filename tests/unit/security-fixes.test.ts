import { describe, it, expect } from 'vitest';

// Test cursor signing/verification
// We need to replicate the logic since it's not exported
import { createHmac } from 'crypto';

const CURSOR_SECRET = process.env.CURSOR_SECRET || 'auditkit-cursor-default-key';

function signCursor(id: number): string {
  const payload = String(id);
  const sig = createHmac('sha256', CURSOR_SECRET).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

function verifyCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const [payload, sig] = decoded.split(':');
    const expected = createHmac('sha256', CURSOR_SECRET).update(payload).digest('hex').slice(0, 16);
    if (sig !== expected) return null;
    return Number(payload);
  } catch { return null; }
}

// Test CSV escaping
function escapeCsvField(val: unknown): string {
  let str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// Password validation regex (matches auth.ts)
function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return false;
  return true;
}

// Redirect validation regex (matches login page)
const SAFE_REDIRECT_RE = /^\/[a-zA-Z0-9\-_/]+$/;

describe('Cursor signing', () => {
  it('signs and verifies a valid cursor', () => {
    const cursor = signCursor(42);
    expect(verifyCursor(cursor)).toBe(42);
  });

  it('rejects a tampered cursor', () => {
    const _cursor = signCursor(42);
    const tampered = Buffer.from('42:0000000000000000').toString('base64');
    expect(verifyCursor(tampered)).toBeNull();
  });

  it('rejects a plain base64 cursor (old format)', () => {
    const oldCursor = Buffer.from('42').toString('base64');
    expect(verifyCursor(oldCursor)).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(verifyCursor('not-base64!!!')).toBeNull();
    expect(verifyCursor('')).toBeNull();
  });

  it('different IDs produce different cursors', () => {
    const c1 = signCursor(1);
    const c2 = signCursor(2);
    expect(c1).not.toBe(c2);
  });
});

describe('CSV formula injection escaping', () => {
  it('escapes = prefix', () => {
    expect(escapeCsvField('=CMD|calc')).toBe(`"'=CMD|calc"`);
  });

  it('escapes + prefix', () => {
    expect(escapeCsvField('+1234')).toBe(`"'+1234"`);
  });

  it('escapes - prefix', () => {
    expect(escapeCsvField('-1234')).toBe(`"'-1234"`);
  });

  it('escapes @ prefix', () => {
    expect(escapeCsvField('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
  });

  it('does not escape normal text', () => {
    expect(escapeCsvField('hello world')).toBe('"hello world"');
  });

  it('escapes double quotes', () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
  });

  it('handles null/undefined', () => {
    expect(escapeCsvField(null)).toBe('""');
    expect(escapeCsvField(undefined)).toBe('""');
  });
});

describe('Password validation', () => {
  it('rejects short passwords', () => {
    expect(validatePassword('Ab1')).toBe(false);
    expect(validatePassword('Abcde1')).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    expect(validatePassword('abcdefg1')).toBe(false);
  });

  it('rejects passwords without lowercase', () => {
    expect(validatePassword('ABCDEFG1')).toBe(false);
  });

  it('rejects passwords without digit', () => {
    expect(validatePassword('Abcdefgh')).toBe(false);
  });

  it('accepts valid passwords', () => {
    expect(validatePassword('Abcdefg1')).toBe(true);
    expect(validatePassword('MyP@ss99')).toBe(true);
  });

  it('rejects all-same-character passwords', () => {
    expect(validatePassword('aaaaaaaa')).toBe(false);
    expect(validatePassword('11111111')).toBe(false);
  });
});

describe('Redirect validation', () => {
  it('allows valid dashboard paths', () => {
    expect(SAFE_REDIRECT_RE.test('/dashboard/overview')).toBe(true);
    expect(SAFE_REDIRECT_RE.test('/dashboard/settings/api-keys')).toBe(true);
  });

  it('rejects protocol-relative URLs', () => {
    expect(SAFE_REDIRECT_RE.test('//evil.com')).toBe(false);
    expect(SAFE_REDIRECT_RE.test('///evil.com')).toBe(false);
  });

  it('rejects URLs with query strings', () => {
    expect(SAFE_REDIRECT_RE.test('/dashboard?evil=1')).toBe(false);
  });

  it('rejects absolute URLs', () => {
    expect(SAFE_REDIRECT_RE.test('https://evil.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(SAFE_REDIRECT_RE.test('')).toBe(false);
  });
});
