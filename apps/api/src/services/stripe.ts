import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return _stripe;
}

const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PLAN_CONFIGS = {
  free: {
    name: 'Free',
    priceId: null,
    price: 0,
    eventQuota: 1000,
    projectQuota: 1,
    retentionDays: 7,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
    price: 2900,
    eventQuota: 50000,
    projectQuota: 3,
    retentionDays: 90,
  },
  business: {
    name: 'Business',
    priceId: process.env.STRIPE_PRICE_BUSINESS || 'price_business_monthly',
    price: 9900,
    eventQuota: 500000,
    projectQuota: 10,
    retentionDays: 365,
  },
  supersize: {
    name: 'Supersize + Milkshake',
    priceId: process.env.STRIPE_PRICE_SUPERSIZE || 'price_supersize_monthly',
    price: 34900,
    eventQuota: 5000000,
    projectQuota: -1, // unlimited
    retentionDays: 2555, // ~7 years
  },
} as const;

export type PlanName = keyof typeof PLAN_CONFIGS;

export async function createCheckoutSession(
  userId: string,
  plan: PlanName,
  successUrl: string,
  cancelUrl: string,
  customerId?: string
): Promise<Stripe.Checkout.Session> {
  const planConfig = PLAN_CONFIGS[plan];
  if (!planConfig.priceId) {
    throw new Error('Cannot create checkout session for free plan');
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
    },
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_creation = 'always';
  }

  return stripe.checkout.sessions.create(sessionParams);
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export function constructWebhookEvent(
  body: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not configured');
  }
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

export { stripe };
