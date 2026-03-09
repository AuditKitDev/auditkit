// ============================================
// @auditkit/shared — Pre-built Event Catalog
// ============================================

// Auth events
export const USER_SIGNED_IN = 'user.signed_in' as const;
export const USER_SIGNED_OUT = 'user.signed_out' as const;
export const USER_SIGNED_UP = 'user.signed_up' as const;
export const USER_PASSWORD_CHANGED = 'user.password_changed' as const;
export const USER_PASSWORD_RESET = 'user.password_reset' as const;
export const USER_MFA_ENABLED = 'user.mfa_enabled' as const;
export const USER_MFA_DISABLED = 'user.mfa_disabled' as const;
export const USER_LOCKED_OUT = 'user.locked_out' as const;
export const USER_EMAIL_CHANGED = 'user.email_changed' as const;

// User management
export const USER_INVITED = 'user.invited' as const;
export const USER_REMOVED = 'user.removed' as const;
export const USER_ROLE_CHANGED = 'user.role_changed' as const;
export const USER_SUSPENDED = 'user.suspended' as const;
export const USER_REACTIVATED = 'user.reactivated' as const;

// Permissions
export const PERMISSION_GRANTED = 'permission.granted' as const;
export const PERMISSION_REVOKED = 'permission.revoked' as const;

// Data
export const DATA_EXPORTED = 'data.exported' as const;
export const DATA_IMPORTED = 'data.imported' as const;
export const DATA_DELETED = 'data.deleted' as const;

// Settings
export const SETTINGS_UPDATED = 'settings.updated' as const;
export const INTEGRATION_CONNECTED = 'integration.connected' as const;
export const INTEGRATION_DISCONNECTED = 'integration.disconnected' as const;

// Billing
export const SUBSCRIPTION_CREATED = 'subscription.created' as const;
export const SUBSCRIPTION_UPDATED = 'subscription.updated' as const;
export const SUBSCRIPTION_CANCELLED = 'subscription.cancelled' as const;
export const PAYMENT_SUCCEEDED = 'payment.succeeded' as const;
export const PAYMENT_FAILED = 'payment.failed' as const;

// API Keys
export const API_KEY_CREATED = 'api_key.created' as const;
export const API_KEY_REVOKED = 'api_key.revoked' as const;
export const API_KEY_ROTATED = 'api_key.rotated' as const;

// Documents / Resources (generic CRUD)
export const RESOURCE_CREATED = 'resource.created' as const;
export const RESOURCE_UPDATED = 'resource.updated' as const;
export const RESOURCE_DELETED = 'resource.deleted' as const;
export const RESOURCE_VIEWED = 'resource.viewed' as const;
export const RESOURCE_SHARED = 'resource.shared' as const;
export const RESOURCE_UNSHARED = 'resource.unshared' as const;

// Organization
export const ORG_CREATED = 'org.created' as const;
export const ORG_UPDATED = 'org.updated' as const;
export const ORG_DELETED = 'org.deleted' as const;

// All events as a namespace
export const Events = {
  USER_SIGNED_IN,
  USER_SIGNED_OUT,
  USER_SIGNED_UP,
  USER_PASSWORD_CHANGED,
  USER_PASSWORD_RESET,
  USER_MFA_ENABLED,
  USER_MFA_DISABLED,
  USER_LOCKED_OUT,
  USER_EMAIL_CHANGED,
  USER_INVITED,
  USER_REMOVED,
  USER_ROLE_CHANGED,
  USER_SUSPENDED,
  USER_REACTIVATED,
  PERMISSION_GRANTED,
  PERMISSION_REVOKED,
  DATA_EXPORTED,
  DATA_IMPORTED,
  DATA_DELETED,
  SETTINGS_UPDATED,
  INTEGRATION_CONNECTED,
  INTEGRATION_DISCONNECTED,
  SUBSCRIPTION_CREATED,
  SUBSCRIPTION_UPDATED,
  SUBSCRIPTION_CANCELLED,
  PAYMENT_SUCCEEDED,
  PAYMENT_FAILED,
  API_KEY_CREATED,
  API_KEY_REVOKED,
  API_KEY_ROTATED,
  RESOURCE_CREATED,
  RESOURCE_UPDATED,
  RESOURCE_DELETED,
  RESOURCE_VIEWED,
  RESOURCE_SHARED,
  RESOURCE_UNSHARED,
  ORG_CREATED,
  ORG_UPDATED,
  ORG_DELETED,
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
