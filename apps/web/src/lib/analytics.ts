/**
 * Client-side analytics helpers for GA4 and PostHog.
 *
 * All functions are safe to call even when the analytics libraries
 * have not loaded (e.g. ad-blockers, missing env vars). They silently
 * no-op in those cases.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gtag(...args: unknown[]): void {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      w.gtag(...args);
    }
  } catch {
    // no-op
  }
}

function posthog(): { capture: (...a: unknown[]) => void; identify: (...a: unknown[]) => void; reset: () => void } | null {
  try {
    const w = window as unknown as { posthog?: { capture: (...a: unknown[]) => void; identify: (...a: unknown[]) => void; reset: () => void } };
    return w.posthog ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tracking functions
// ---------------------------------------------------------------------------

/** Fire GA4 `sign_up` event + PostHog `user_signed_up`. */
export function trackSignup(email: string, plan?: string): void {
  gtag('event', 'sign_up', { method: 'email', email, plan: plan ?? 'free' });
  posthog()?.capture('user_signed_up', { email, plan: plan ?? 'free' });
}

/** Fire GA4 `login` event + PostHog `user_logged_in`. */
export function trackLogin(email: string): void {
  gtag('event', 'login', { method: 'email', email });
  posthog()?.capture('user_logged_in', { email });
}

/** Fire GA4 `event_created` custom event. */
export function trackEventCreated(projectName: string): void {
  gtag('event', 'event_created', { project_name: projectName });
  posthog()?.capture('event_created', { project_name: projectName });
}

/** Fire GA4 `project_created` custom event. */
export function trackProjectCreated(name: string): void {
  gtag('event', 'project_created', { project_name: name });
  posthog()?.capture('project_created', { project_name: name });
}

/** Fire GA4 `plan_upgraded` custom event. */
export function trackPlanUpgraded(fromPlan: string, toPlan: string): void {
  gtag('event', 'plan_upgraded', { from_plan: fromPlan, to_plan: toPlan });
  posthog()?.capture('plan_upgraded', { from_plan: fromPlan, to_plan: toPlan });
}

/** Set GA4 user properties + PostHog identify. */
export function identifyUser(userId: string, email: string, plan?: string): void {
  gtag('set', 'user_properties', { user_id: userId, email, plan: plan ?? 'free' });
  gtag('set', { user_id: userId });
  posthog()?.identify(userId, { email, plan: plan ?? 'free' });
}

/** Reset PostHog identity on logout. */
export function resetAnalytics(): void {
  posthog()?.reset();
}
