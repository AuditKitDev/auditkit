import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptCredential,
  decryptCredential,
  encryptSiemConfig,
  decryptSiemConfig,
  redactSiemConfig,
} from '../../apps/api/src/services/siem-encryption.js';

beforeAll(() => {
  process.env.SIEM_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32';
});

describe('encryptCredential / decryptCredential', () => {
  it('round-trips a simple string', () => {
    const plaintext = 'my-secret-api-key';
    const encrypted = encryptCredential(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decryptCredential(encrypted)).toBe(plaintext);
  });

  it('round-trips an empty string', () => {
    const encrypted = encryptCredential('');
    expect(decryptCredential(encrypted)).toBe('');
  });

  it('round-trips a long string', () => {
    const plaintext = 'a'.repeat(10000);
    expect(decryptCredential(encryptCredential(plaintext))).toBe(plaintext);
  });

  it('round-trips special characters', () => {
    const plaintext = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`\n\t';
    expect(decryptCredential(encryptCredential(plaintext))).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const plaintext = 'same-input';
    const a = encryptCredential(plaintext);
    const b = encryptCredential(plaintext);
    expect(a).not.toBe(b); // Different IVs
    expect(decryptCredential(a)).toBe(plaintext);
    expect(decryptCredential(b)).toBe(plaintext);
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptCredential('secret');
    const tampered = encrypted.slice(0, -4) + 'ZZZZ';
    expect(() => decryptCredential(tampered)).toThrow();
  });
});

describe('encryptSiemConfig / decryptSiemConfig', () => {
  it('encrypts sensitive fields and marks them', () => {
    const config = { hecToken: 'tok_123', hecUrl: 'https://splunk.example.com' };
    const encrypted = encryptSiemConfig(config);
    expect(encrypted.hecToken).not.toBe('tok_123');
    expect(encrypted.hecToken_encrypted).toBe(true);
    expect(encrypted.hecUrl).toBe('https://splunk.example.com'); // not sensitive
  });

  it('round-trips config through encrypt/decrypt', () => {
    const config = {
      apiKey: 'dd_key_abc123',
      site: 'US1',
      hecToken: 'splunk_token',
    };
    const encrypted = encryptSiemConfig(config);
    const decrypted = decryptSiemConfig(encrypted);
    expect(decrypted.apiKey).toBe('dd_key_abc123');
    expect(decrypted.hecToken).toBe('splunk_token');
    expect(decrypted.site).toBe('US1');
    expect(decrypted.apiKey_encrypted).toBeUndefined();
  });

  it('handles config with no sensitive fields', () => {
    const config = { name: 'test', url: 'https://example.com' };
    const encrypted = encryptSiemConfig(config);
    expect(encrypted).toEqual(config);
  });

  it('handles null/undefined sensitive fields', () => {
    const config = { hecToken: null, apiKey: undefined, name: 'test' };
    const encrypted = encryptSiemConfig(config as any);
    expect(encrypted.hecToken).toBe(null);
    expect(encrypted.apiKey).toBeUndefined();
  });

  it('encrypts secret_access_key field', () => {
    const config = { secret_access_key: 'aws_secret', bucket: 'my-bucket' };
    const encrypted = encryptSiemConfig(config);
    expect(encrypted.secret_access_key).not.toBe('aws_secret');
    expect(encrypted.secret_access_key_encrypted).toBe(true);
    const decrypted = decryptSiemConfig(encrypted);
    expect(decrypted.secret_access_key).toBe('aws_secret');
  });
});

describe('redactSiemConfig', () => {
  it('redacts sensitive fields showing last 4 chars', () => {
    const config = { apiKey: 'abcdefghijklmnop', site: 'US1' };
    const redacted = redactSiemConfig(config);
    expect(redacted.apiKey).toEqual({ configured: true, lastFour: '****mnop' });
    expect(redacted.site).toBe('US1');
  });

  it('redacts short sensitive values with ****', () => {
    const config = { apiKey: 'ab' };
    const redacted = redactSiemConfig(config);
    // Value < 4 chars: slice(-4) of 'ab' is 'ab', but length < 4 so code returns just '****'
    expect(redacted.apiKey).toEqual({ configured: true, lastFour: '****' });
  });

  it('skips null/undefined fields', () => {
    const config = { apiKey: null, hecToken: undefined, name: 'test' };
    const redacted = redactSiemConfig(config as any);
    expect(redacted.apiKey).toBe(null);
    expect(redacted.hecToken).toBeUndefined();
  });

  it('does not modify non-sensitive fields', () => {
    const config = { name: 'Splunk HEC', url: 'https://splunk.example.com', hecToken: 'secret123' };
    const redacted = redactSiemConfig(config);
    expect(redacted.name).toBe('Splunk HEC');
    expect(redacted.url).toBe('https://splunk.example.com');
  });
});
