import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { notificationRules } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { logger } from './logger.js';

interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

interface EventPayload {
  action?: string;
  severity?: string;
  actor_id?: string;
  actor?: { id?: string };
  is_failure?: boolean;
  is_anomalous?: boolean;
  target_type?: string;
  target?: { type?: string };
  [key: string]: unknown;
}

function getEventFieldValue(event: EventPayload, field: string): unknown {
  switch (field) {
    case 'action':
      return event.action;
    case 'severity':
      return event.severity;
    case 'actor_id':
      return event.actor_id ?? event.actor?.id;
    case 'is_failure':
      return event.is_failure;
    case 'is_anomalous':
      return event.is_anomalous;
    case 'target_type':
      return event.target_type ?? event.target?.type;
    default:
      return undefined;
  }
}

function evaluateCondition(condition: Condition, event: EventPayload): boolean {
  const fieldValue = getEventFieldValue(event, condition.field);

  switch (condition.operator) {
    case 'eq':
      return String(fieldValue) === String(condition.value);
    case 'neq':
      return String(fieldValue) !== String(condition.value);
    case 'contains':
      return String(fieldValue ?? '').includes(String(condition.value));
    case 'gt':
      return Number(fieldValue) > Number(condition.value);
    case 'lt':
      return Number(fieldValue) < Number(condition.value);
    default:
      return false;
  }
}

function allConditionsMatch(conditions: Condition[], event: EventPayload): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, event));
}

function formatSlackMessage(event: EventPayload): object {
  return {
    text: `AuditKit Alert`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AuditKit Event*\n*Action:* \`${event.action ?? 'unknown'}\`\n*Severity:* ${event.severity ?? 'info'}\n*Actor:* ${event.actor_id ?? event.actor?.id ?? 'unknown'}`,
        },
      },
    ],
  };
}

function formatDiscordMessage(event: EventPayload): object {
  return {
    embeds: [
      {
        title: 'AuditKit Event',
        color: event.severity === 'critical' ? 0xff0000 : event.severity === 'error' ? 0xff6600 : 0x818cf8,
        fields: [
          { name: 'Action', value: event.action ?? 'unknown', inline: true },
          { name: 'Severity', value: event.severity ?? 'info', inline: true },
          { name: 'Actor', value: String(event.actor_id ?? event.actor?.id ?? 'unknown'), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendSlack(webhookUrl: string, event: EventPayload): Promise<void> {
  if (!isValidWebhookUrl(webhookUrl)) {
    logger.error('Skipping Slack webhook with invalid/private URL');
    return;
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formatSlackMessage(event)),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}`);
  }
}

async function sendDiscord(webhookUrl: string, event: EventPayload): Promise<void> {
  if (!isValidWebhookUrl(webhookUrl)) {
    logger.error('Skipping Discord webhook with invalid/private URL');
    return;
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formatDiscordMessage(event)),
  });
  if (!response.ok) {
    throw new Error(`Discord webhook returned ${response.status}`);
  }
}

function sendEmail(config: Record<string, unknown>, event: EventPayload): void {
  logger.info(
    { to: config.email ?? config.address ?? 'unknown', action: event.action },
    'Would send notification email'
  );
}

function isValidWebhookUrl(urlStr: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]' || hostname === '0.0.0.0') return false;

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) return false;
  }

  if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('[fc') || hostname.startsWith('[fd')) return false;

  return true;
}

async function sendWebhook(config: Record<string, unknown>, event: EventPayload): Promise<void> {
  const url = config.url as string;

  if (!isValidWebhookUrl(url)) {
    logger.error('Skipping webhook with invalid/private URL');
    return;
  }

  const secret = (config.secret as string) ?? '';
  const payload = JSON.stringify(event);
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AuditKit-Signature': `sha256=${signature}`,
    },
    body: payload,
  });
  if (!response.ok) {
    throw new Error(`Notification webhook returned ${response.status}`);
  }
}

async function triggerNotification(
  channelType: string,
  channelConfig: Record<string, unknown>,
  event: EventPayload
): Promise<void> {
  switch (channelType) {
    case 'slack':
      await sendSlack(channelConfig.webhook_url as string, event);
      break;
    case 'discord':
      await sendDiscord(channelConfig.webhook_url as string, event);
      break;
    case 'email':
      sendEmail(channelConfig, event);
      break;
    case 'webhook':
      await sendWebhook(channelConfig, event);
      break;
    default:
      logger.warn({ channelType }, 'Unknown notification channel type');
  }
}

/**
 * Evaluate all active notification rules for a project against an incoming event.
 * Evaluate and deliver notifications before the queue job completes.
 */
export async function evaluateNotificationRules(
  db: Database,
  projectId: string,
  event: EventPayload
): Promise<void> {
  try {
    const rules = await db
      .select()
      .from(notificationRules)
      .where(
        and(
          eq(notificationRules.projectId, projectId),
          eq(notificationRules.isActive, true)
        )
      );

    for (const rule of rules) {
      try {
        const conditions = (rule.conditions as Condition[] | Record<string, unknown>);
        const conditionArray = Array.isArray(conditions) ? conditions : [];

        if (allConditionsMatch(conditionArray, event)) {
          const channelConfig = (rule.channelConfig ?? {}) as Record<string, unknown>;
          await triggerNotification(rule.channelType, channelConfig, event);
        }
      } catch (err) {
        logger.error({ err, channelType: rule.channelType, rule: rule.name }, 'Failed to send notification');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error fetching notification rules');
  }
}
