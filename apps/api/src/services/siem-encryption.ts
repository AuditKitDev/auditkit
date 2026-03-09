import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.SIEM_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SIEM_ENCRYPTION_KEY environment variable is required for SIEM credential storage');
  }
  // Derive a 32-byte key via SHA-256
  return createHash('sha256').update(key).digest();
}

export function encryptCredential(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptCredential(encoded: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encoded, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// List of SIEM config fields that contain sensitive credentials
const SENSITIVE_FIELDS = ['hecToken', 'apiKey', 'sharedKey', 'serviceAccountJson', 'password', 'secret_access_key'];

export function encryptSiemConfig(config: Record<string, unknown>): Record<string, unknown> {
  const encrypted = { ...config };
  for (const field of SENSITIVE_FIELDS) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      const value = typeof encrypted[field] === 'string'
        ? encrypted[field] as string
        : JSON.stringify(encrypted[field]);
      encrypted[field] = encryptCredential(value);
      encrypted[`${field}_encrypted`] = true;
    }
  }
  return encrypted;
}

export function decryptSiemConfig(config: Record<string, unknown>): Record<string, unknown> {
  const decrypted = { ...config };
  for (const field of SENSITIVE_FIELDS) {
    if (decrypted[`${field}_encrypted`] === true && typeof decrypted[field] === 'string') {
      const raw = decryptCredential(decrypted[field] as string);
      // Try to parse as JSON (for serviceAccountJson)
      try {
        decrypted[field] = JSON.parse(raw);
      } catch {
        decrypted[field] = raw;
      }
      delete decrypted[`${field}_encrypted`];
    }
  }
  return decrypted;
}

export function redactSiemConfig(config: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...config };
  for (const field of SENSITIVE_FIELDS) {
    if (redacted[field] !== undefined && redacted[field] !== null) {
      const value = typeof redacted[field] === 'string' ? redacted[field] as string : '';
      redacted[field] = {
        configured: true,
        lastFour: value.length >= 4 ? `****${value.slice(-4)}` : '****',
      };
      // Remove the _encrypted flag from redacted output
      delete redacted[`${field}_encrypted`];
    }
  }
  return redacted;
}
