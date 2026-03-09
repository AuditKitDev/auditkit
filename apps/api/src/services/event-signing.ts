import { createHash, generateKeyPairSync, sign, verify, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { eq, and, isNull, desc } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { signingKeys } from '../db/schema.js';

function getEncryptionKey(): string {
  const key = process.env.SIGNING_KEY_ENCRYPTION_KEY;
  if (!key) throw new Error('SIGNING_KEY_ENCRYPTION_KEY environment variable is required');
  if (key.length < 32) throw new Error('SIGNING_KEY_ENCRYPTION_KEY must be at least 32 characters');
  return key;
}

/**
 * Encrypt a private key for storage using AES-256-GCM.
 */
function encryptPrivateKey(privateKey: string): string {
  const key = createHash('sha256').update(getEncryptionKey()).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted private key.
 */
function decryptPrivateKey(encrypted: string): string {
  const key = createHash('sha256').update(getEncryptionKey()).digest();
  const [ivHex, authTagHex, cipherText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate an Ed25519 keypair for a project and store it.
 */
export async function generateSigningKeypair(
  db: Database,
  projectId: string
): Promise<{ id: string; publicKey: string }> {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const encryptedPrivateKey = encryptPrivateKey(privateKey);

  const [inserted] = await db
    .insert(signingKeys)
    .values({
      projectId,
      publicKey,
      privateKeyEncrypted: encryptedPrivateKey,
      algorithm: 'Ed25519',
    })
    .returning({ id: signingKeys.id, publicKey: signingKeys.publicKey });

  return { id: inserted.id, publicKey: inserted.publicKey };
}

/**
 * Get the active (non-revoked) signing key for a project.
 * Returns the most recently created non-revoked key.
 */
export async function getActiveSigningKey(
  db: Database,
  projectId: string
): Promise<{ id: string; publicKey: string; privateKeyEncrypted: string } | null> {
  const result = await db
    .select({
      id: signingKeys.id,
      publicKey: signingKeys.publicKey,
      privateKeyEncrypted: signingKeys.privateKeyEncrypted,
    })
    .from(signingKeys)
    .where(
      and(eq(signingKeys.projectId, projectId), isNull(signingKeys.revokedAt))
    )
    .orderBy(desc(signingKeys.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Sign an event payload hash with the project's active private key.
 * Returns the signature and key ID, or null if no active key exists.
 */
export async function signEvent(
  db: Database,
  projectId: string,
  payloadHash: string
): Promise<{ signature: string; signingKeyId: string } | null> {
  const activeKey = await getActiveSigningKey(db, projectId);
  if (!activeKey) return null;

  const privateKeyPem = decryptPrivateKey(activeKey.privateKeyEncrypted);
  const signature = sign(null, Buffer.from(payloadHash), privateKeyPem);

  return {
    signature: signature.toString('base64'),
    signingKeyId: activeKey.id,
  };
}

/**
 * Verify an event's signature against the stored public key.
 */
export async function verifyEventSignature(
  db: Database,
  payloadHash: string,
  signatureBase64: string,
  keyId: string
): Promise<{ valid: boolean; publicKey: string | null }> {
  const result = await db
    .select({
      publicKey: signingKeys.publicKey,
    })
    .from(signingKeys)
    .where(eq(signingKeys.id, keyId))
    .limit(1);

  if (result.length === 0) {
    return { valid: false, publicKey: null };
  }

  const publicKey = result[0].publicKey;

  try {
    const isValid = verify(
      null,
      Buffer.from(payloadHash),
      publicKey,
      Buffer.from(signatureBase64, 'base64')
    );
    return { valid: isValid, publicKey };
  } catch {
    return { valid: false, publicKey };
  }
}

/**
 * Rotate signing key: revoke the current active key and generate a new one.
 * The old key remains in the database for verifying historical signatures.
 */
export async function rotateSigningKey(
  db: Database,
  projectId: string
): Promise<{ id: string; publicKey: string }> {
  // Revoke all existing non-revoked keys
  await db
    .update(signingKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(signingKeys.projectId, projectId), isNull(signingKeys.revokedAt))
    );

  // Generate new keypair
  return generateSigningKeypair(db, projectId);
}
