import { AuditKit } from '@auditkit/sdk';

let _client: AuditKit | null = null;

/**
 * Get the AuditKit client for use in Server Actions and API routes.
 * Initializes lazily on first call.
 *
 * @example
 * import { auditkit } from '@auditkit/next';
 *
 * export async function updateDocument(id: string) {
 *   await auditkit().log('document.updated', {
 *     actor: { id: getCurrentUserId() },
 *     target: { type: 'document', id },
 *     tenantId: getCurrentTenantId(),
 *   });
 * }
 */
export function auditkit(): AuditKit {
  if (!_client) {
    const apiKey = process.env.AUDITKIT_API_KEY;
    if (!apiKey) {
      throw new Error(
        'AUDITKIT_API_KEY environment variable is not set. ' +
          'Set it in .env.local or pass it explicitly.'
      );
    }
    _client = new AuditKit({
      apiKey,
      baseUrl: process.env.AUDITKIT_BASE_URL,
    });
  }
  return _client;
}
