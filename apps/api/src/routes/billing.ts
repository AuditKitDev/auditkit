import { Hono } from 'hono';
import { eq, and, gte, count, inArray } from 'drizzle-orm';
import type { SessionUser, SessionProject } from '../middleware/session-auth.js';
import { subscriptions, auditEvents, projects } from '../db/schema.js';
import type { Database } from '../db/index.js';
import {
  PLAN_CONFIGS,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  type PlanName,
} from '../services/stripe.js';
import { logger } from '../services/logger.js';

export function createBillingRouter(db: Database) {
  const router = new Hono<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>();

  // POST /checkout — create Stripe checkout session
  router.post('/checkout', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { plan, success_url, cancel_url } = body;

    if (!plan || !success_url || !cancel_url) {
      return c.json({ code: 'INVALID', message: 'plan, success_url, and cancel_url are required' }, 400);
    }

    if (!(plan in PLAN_CONFIGS) || plan === 'free') {
      return c.json({ code: 'INVALID', message: 'Invalid plan' }, 400);
    }

    // Get or create subscription record
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const customerId = existing.length > 0 ? existing[0].stripeCustomerId : undefined;

    const session = await createCheckoutSession(
      user.id,
      plan as PlanName,
      success_url,
      cancel_url,
      customerId || undefined
    );

    return c.json({ url: session.url });
  });

  // POST /portal — create Stripe billing portal session
  router.post('/portal', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { return_url } = body;

    if (!return_url) {
      return c.json({ code: 'INVALID', message: 'return_url is required' }, 400);
    }

    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (existing.length === 0 || !existing[0].stripeCustomerId) {
      return c.json({ code: 'NO_SUBSCRIPTION', message: 'No billing account found' }, 400);
    }

    const session = await createPortalSession(existing[0].stripeCustomerId, return_url);

    return c.json({ url: session.url });
  });

  // GET /subscription — get current subscription + usage
  router.get('/subscription', async (c) => {
    const user = c.get('user');

    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const sub = existing.length > 0
      ? existing[0]
      : {
          plan: 'free' as const,
          status: 'active' as const,
          eventQuota: 1000,
          projectQuota: 1,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        };

    // Count events this billing period
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.userId, user.id));

    let eventCount = 0;
    if (userProjects.length > 0) {
      const now = new Date();
      const periodStart = sub.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1);

      const projectIds = userProjects.map(p => p.id);
      const [result] = await db
        .select({ count: count() })
        .from(auditEvents)
        .where(
          and(
            inArray(auditEvents.projectId, projectIds),
            gte(auditEvents.occurredAt, periodStart)
          )
        );
      eventCount = result.count;
    }

    const planConfig = (sub.plan in PLAN_CONFIGS)
      ? PLAN_CONFIGS[sub.plan as PlanName]
      : PLAN_CONFIGS.free;

    return c.json({
      plan: sub.plan,
      plan_name: planConfig.name,
      status: sub.status,
      event_quota: sub.eventQuota,
      project_quota: sub.projectQuota,
      retention_days: planConfig.retentionDays,
      event_count: eventCount,
      project_count: userProjects.length,
      current_period_start: sub.currentPeriodStart
        ? (sub.currentPeriodStart instanceof Date ? sub.currentPeriodStart.toISOString() : sub.currentPeriodStart)
        : null,
      current_period_end: sub.currentPeriodEnd
        ? (sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.toISOString() : sub.currentPeriodEnd)
        : null,
      has_stripe: !!sub.stripeCustomerId,
    });
  });

  return router;
}

// Webhook handler — separate, no session auth
export function createBillingWebhookRouter(db: Database) {
  const router = new Hono();

  router.post('/webhook', async (c) => {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ code: 'INVALID', message: 'Missing stripe-signature header' }, 400);
    }

    let event;
    try {
      const body = await c.req.text();
      event = constructWebhookEvent(body, signature);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err: message }, 'Webhook signature verification failed');
      return c.json({ code: 'INVALID', message: 'Invalid signature' }, 400);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanName;

        if (!userId || !plan || !(plan in PLAN_CONFIGS)) break;

        const planConfig = PLAN_CONFIGS[plan];

        // Upsert subscription
        const existing = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(subscriptions)
            .set({
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              plan,
              status: 'active',
              eventQuota: planConfig.eventQuota === -1 ? 2147483647 : planConfig.eventQuota,
              projectQuota: planConfig.projectQuota === -1 ? 2147483647 : planConfig.projectQuota,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.userId, userId));
        } else {
          await db.insert(subscriptions).values({
            userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            plan,
            status: 'active',
            eventQuota: planConfig.eventQuota === -1 ? 2147483647 : planConfig.eventQuota,
            projectQuota: planConfig.projectQuota === -1 ? 2147483647 : planConfig.projectQuota,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;

        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          trialing: 'trialing',
          unpaid: 'past_due',
        };

        await db
          .update(subscriptions)
          .set({
            status: statusMap[subscription.status] || 'active',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;

        // Downgrade to free
        await db
          .update(subscriptions)
          .set({
            plan: 'free',
            status: 'canceled',
            stripeSubscriptionId: null,
            eventQuota: PLAN_CONFIGS.free.eventQuota,
            projectQuota: PLAN_CONFIGS.free.projectQuota,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        await db
          .update(subscriptions)
          .set({
            status: 'past_due',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }
    }

    return c.json({ received: true });
  });

  return router;
}
