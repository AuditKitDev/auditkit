/**
 * Slack notifications for signup and key activity tracking.
 *
 * Reads SLACK_SIGNUP_WEBHOOK_URL from env. All calls are fire-and-forget
 * so they never block the request path.
 */

import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// notifySignup
// ---------------------------------------------------------------------------

interface SignupPayload {
  email: string;
  name: string;
  plan?: string;
  role?: string;
}

export function notifySignup(payload: SignupPayload): void {
  const webhookUrl = process.env.SLACK_SIGNUP_WEBHOOK_URL;
  if (!webhookUrl) return;

  const ts = new Date().toISOString();

  const body = {
    text: `New signup: ${payload.email}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New User Signup', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Email:*\n${payload.email}` },
          { type: 'mrkdwn', text: `*Name:*\n${payload.name}` },
          { type: 'mrkdwn', text: `*Plan:*\n${payload.plan ?? 'free'}` },
          { type: 'mrkdwn', text: `*Role:*\n${payload.role ?? 'user'}` },
        ],
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Signed up at ${ts}` }],
      },
    ],
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => {
    logger.warn({ err }, 'Failed to send signup Slack notification');
  });
}

// ---------------------------------------------------------------------------
// notifyActivity
// ---------------------------------------------------------------------------

type ActivityAction =
  | 'event.created'
  | 'team_member.invited'
  | 'project.created'
  | 'plan.upgraded'
  | 'api_key.created'
  | string;

interface ActivityPayload {
  action: ActivityAction;
  actorEmail: string;
  detail?: string;
}

export function notifyActivity(payload: ActivityPayload): void {
  const webhookUrl = process.env.SLACK_SIGNUP_WEBHOOK_URL;
  if (!webhookUrl) return;

  const ts = new Date().toISOString();

  const body = {
    text: `Activity: ${payload.action} by ${payload.actorEmail}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Activity:* \`${payload.action}\`\n*Actor:* ${payload.actorEmail}${payload.detail ? `\n*Detail:* ${payload.detail}` : ''}`,
        },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: ts }],
      },
    ],
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => {
    logger.warn({ err }, 'Failed to send activity Slack notification');
  });
}
