import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { siemConnectors } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { decryptSiemConfig } from './siem-encryption.js';
import { logger } from './logger.js';

interface EventPayload {
  [key: string]: unknown;
}

async function streamToSplunk(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const hecUrl = config.hecUrl as string;
  const hecToken = config.hecToken as string;

  const response = await fetch(hecUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Splunk ${hecToken}`,
    },
    body: JSON.stringify({
      event,
      sourcetype: 'auditkit:event',
      source: 'auditkit-api',
    }),
  });
  if (!response.ok) {
    throw new Error(`Splunk returned ${response.status}`);
  }
}

async function streamToDatadog(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const apiKey = config.apiKey as string;
  const site = (config.site as string) ?? 'us1';
  const hostname = site === 'eu1' ? 'http-intake.logs.datadoghq.eu' : 'http-intake.logs.datadoghq.com';

  const response = await fetch(`https://${hostname}/api/v2/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
    },
    body: JSON.stringify([
      {
        ddsource: 'auditkit',
        ddtags: `action:${event.action ?? 'unknown'},severity:${event.severity ?? 'info'}`,
        message: JSON.stringify(event),
        service: 'auditkit',
      },
    ]),
  });
  if (!response.ok) {
    throw new Error(`Datadog returned ${response.status}`);
  }
}

function streamToS3(config: Record<string, unknown>, event: EventPayload): void {
  logger.info(
    { bucket: config.bucket, region: config.region ?? 'us-east-1', action: event.action ?? 'unknown' },
    'Would upload to S3 bucket'
  );
}

async function streamToCustomHttp(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const url = config.url as string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add custom headers if provided
  if (config.headers && typeof config.headers === 'object') {
    const customHeaders = config.headers as Record<string, string>;
    for (const [key, value] of Object.entries(customHeaders)) {
      headers[key] = value;
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    throw new Error(`Custom HTTP returned ${response.status}`);
  }
}

/**
 * Microsoft Sentinel: POST to Log Analytics Data Collector API.
 * Uses HMAC-SHA256 auth with workspace ID and shared key.
 * Config: { workspaceId, sharedKey, logType? }
 */
async function streamToSentinel(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const workspaceId = config.workspaceId as string;
  const sharedKey = config.sharedKey as string;
  const logType = (config.logType as string) ?? 'AuditKit';

  const body = JSON.stringify([event]);
  const contentLength = Buffer.byteLength(body, 'utf-8');
  const rfc1123Date = new Date().toUTCString();
  const method = 'POST';
  const contentType = 'application/json';
  const resource = '/api/logs';

  // Build the signature string per Azure Log Analytics spec
  const stringToSign = `${method}\n${contentLength}\n${contentType}\nx-ms-date:${rfc1123Date}\n${resource}`;
  const decodedKey = Buffer.from(sharedKey, 'base64');
  const hmac = createHmac('sha256', decodedKey).update(stringToSign, 'utf-8').digest('base64');
  const authorization = `SharedKey ${workspaceId}:${hmac}`;

  const response = await fetch(
    `https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Log-Type': logType,
        'x-ms-date': rfc1123Date,
        Authorization: authorization,
        'time-generated-field': 'occurredAt',
      },
      body,
    }
  );
  if (!response.ok) {
    throw new Error(`Sentinel returned ${response.status}`);
  }
}

/**
 * Google Cloud Storage: Upload JSON log files to a GCS bucket.
 * Batches events into NDJSON files, uploaded via signed URL or service account.
 * Config: { bucket, signedUrl?, serviceAccountJson?, prefix? }
 */
async function streamToGCS(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const bucket = config.bucket as string;
  const prefix = (config.prefix as string) ?? 'auditkit';
  const ndjsonLine = JSON.stringify(event);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectName = `${prefix}/${timestamp}-${Math.random().toString(36).slice(2, 10)}.ndjson`;

  if (config.signedUrl) {
    // Use pre-signed URL directly
    const signedUrl = config.signedUrl as string;
    await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjsonLine,
    });
  } else if (config.serviceAccountJson) {
    // Use service account JSON for OAuth2 token (JWT grant)
    const sa = config.serviceAccountJson as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);

    // Build JWT header and claims
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/devstorage.read_write',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    ).toString('base64url');

    // Sign with private key using Node crypto
    const { createSign } = await import('crypto');
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = `${header}.${claims}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    if (!tokenRes.ok) {
      throw new Error(`GCS token exchange returned ${tokenRes.status}`);
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Upload to GCS JSON API
    const uploadRes = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: ndjsonLine,
      }
    );
    if (!uploadRes.ok) {
      throw new Error(`GCS upload returned ${uploadRes.status}`);
    }
  } else {
    logger.info(
      { bucket, objectName, action: event.action ?? 'unknown' },
      'Would upload to GCS bucket'
    );
  }
}

/**
 * BigQuery: Stream insert via BigQuery REST API.
 * Config: { projectId, dataset, table, serviceAccountJson }
 */
async function streamToBigQuery(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const bqProjectId = config.projectId as string;
  const dataset = config.dataset as string;
  const table = config.table as string;

  if (!config.serviceAccountJson) {
    logger.info(
      { bqProjectId, dataset, table, action: event.action ?? 'unknown' },
      'Would stream to BigQuery'
    );
    return;
  }

  const sa = config.serviceAccountJson as Record<string, string>;
  const now = Math.floor(Date.now() / 1000);

  // Build JWT for BigQuery scope
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/bigquery.insertdata',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');

  const { createSign } = await import('crypto');
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${claims}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) {
    throw new Error(`BigQuery token exchange returned ${tokenRes.status}`);
  }
  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Stream insert to BigQuery
  const insertRes = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(bqProjectId)}/datasets/${encodeURIComponent(dataset)}/tables/${encodeURIComponent(table)}/insertAll`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        rows: [
          {
            insertId: (event.event_id as string) ?? crypto.randomUUID(),
            json: event,
          },
        ],
      }),
    }
  );
  if (!insertRes.ok) {
    throw new Error(`BigQuery returned ${insertRes.status}`);
  }
}

/**
 * Elastic/OpenSearch: POST to _bulk endpoint.
 * Config: { url, indexName, apiKey?, username?, password? }
 */
async function streamToElastic(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const url = config.url as string;
  const indexName = (config.indexName as string) ?? 'auditkit-events';

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-ndjson',
  };

  // Auth: API key takes precedence, then basic auth
  if (config.apiKey) {
    headers['Authorization'] = `ApiKey ${config.apiKey as string}`;
  } else if (config.username && config.password) {
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // Bulk format: action line + document line, each terminated by newline
  const bulkBody =
    JSON.stringify({ index: { _index: indexName } }) +
    '\n' +
    JSON.stringify(event) +
    '\n';

  const response = await fetch(`${url.replace(/\/$/, '')}/_bulk`, {
    method: 'POST',
    headers,
    body: bulkBody,
  });
  if (!response.ok) {
    throw new Error(`Elastic returned ${response.status}`);
  }
}

/**
 * Stream an event to all active SIEM connectors for a project.
 * Stream to active SIEM connectors before the queue job completes.
 */
export async function streamToSIEM(
  db: Database,
  projectId: string,
  event: EventPayload
): Promise<void> {
  try {
    const connectors = await db
      .select()
      .from(siemConnectors)
      .where(
        and(
          eq(siemConnectors.projectId, projectId),
          eq(siemConnectors.isActive, true)
        )
      );

    for (const connector of connectors) {
      try {
        const config = decryptSiemConfig((connector.config ?? {}) as Record<string, unknown>);

        switch (connector.type) {
          case 'splunk':
            await streamToSplunk(config, event);
            break;
          case 'datadog':
            await streamToDatadog(config, event);
            break;
          case 's3':
            streamToS3(config, event);
            break;
          case 'custom_http':
            await streamToCustomHttp(config, event);
            break;
          case 'sentinel':
            await streamToSentinel(config, event);
            break;
          case 'gcs':
            await streamToGCS(config, event);
            break;
          case 'bigquery':
            await streamToBigQuery(config, event);
            break;
          case 'elastic':
            await streamToElastic(config, event);
            break;
          default:
            logger.warn({ type: connector.type }, 'Unknown SIEM connector type');
            continue;
        }

        await db
          .update(siemConnectors)
          .set({ lastSyncAt: new Date() })
          .where(eq(siemConnectors.id, connector.id));
      } catch (err) {
        logger.error({ err, connector: connector.name }, 'Error streaming to SIEM connector');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error fetching SIEM connectors');
  }
}
