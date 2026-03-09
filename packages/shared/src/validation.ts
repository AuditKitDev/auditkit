// ============================================
// @auditkit/shared — Validation Utilities
// ============================================

import type { AuditEventInput, AuditSeverity } from './types.js';

const VALID_SEVERITIES: AuditSeverity[] = ['info', 'warn', 'error', 'critical'];
const VALID_ACTOR_TYPES = ['user', 'api_key', 'system', 'service'] as const;
const ACTION_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
const MAX_METADATA_KEYS = 50;
const MAX_METADATA_SIZE = 10240; // 10KB
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 4096;
const MAX_ACTION_LENGTH = 256;
const MAX_ERROR_MESSAGE_LENGTH = 10000;
const MAX_ACTOR_ID_LENGTH = 256;
const MAX_ACTOR_NAME_LENGTH = 256;
const MAX_ACTOR_EMAIL_LENGTH = 256;
const MAX_TARGET_TYPE_LENGTH = 256;
const MAX_TARGET_ID_LENGTH = 256;
const MAX_TARGET_NAME_LENGTH = 256;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEventInput(input: AuditEventInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Action
  if (!input.action) {
    errors.push({ field: 'action', message: 'Action is required' });
  } else if (input.action.length > MAX_ACTION_LENGTH) {
    errors.push({ field: 'action', message: `Action must be ${MAX_ACTION_LENGTH} characters or less` });
  } else if (!ACTION_PATTERN.test(input.action)) {
    errors.push({
      field: 'action',
      message: 'Action must be lowercase noun.verb format (e.g. "document.updated")',
    });
  }

  // Actor
  if (!input.actor) {
    errors.push({ field: 'actor', message: 'Actor is required' });
  } else {
    if (!input.actor.id) {
      errors.push({ field: 'actor.id', message: 'Actor ID is required' });
    } else if (input.actor.id.length > MAX_ACTOR_ID_LENGTH) {
      errors.push({ field: 'actor.id', message: `Actor ID must be ${MAX_ACTOR_ID_LENGTH} characters or less` });
    }
    if (input.actor.name && input.actor.name.length > MAX_ACTOR_NAME_LENGTH) {
      errors.push({ field: 'actor.name', message: `Actor name must be ${MAX_ACTOR_NAME_LENGTH} characters or less` });
    }
    if (input.actor.email && input.actor.email.length > MAX_ACTOR_EMAIL_LENGTH) {
      errors.push({ field: 'actor.email', message: `Actor email must be ${MAX_ACTOR_EMAIL_LENGTH} characters or less` });
    }
    if (input.actor.type && !VALID_ACTOR_TYPES.includes(input.actor.type)) {
      errors.push({
        field: 'actor.type',
        message: `Actor type must be one of: ${VALID_ACTOR_TYPES.join(', ')}`,
      });
    }
    if (input.actor.metadata) {
      const keys = Object.keys(input.actor.metadata);
      if (keys.length > MAX_METADATA_KEYS) {
        errors.push({
          field: 'actor.metadata',
          message: `Actor metadata must have ${MAX_METADATA_KEYS} keys or fewer`,
        });
      }
      const size = JSON.stringify(input.actor.metadata).length;
      if (size > MAX_METADATA_SIZE) {
        errors.push({
          field: 'actor.metadata',
          message: `Actor metadata must be ${MAX_METADATA_SIZE} bytes or less (got ${size})`,
        });
      }
    }
  }

  // Severity
  if (input.severity && !VALID_SEVERITIES.includes(input.severity)) {
    errors.push({
      field: 'severity',
      message: `Severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
    });
  }

  // Metadata
  if (input.metadata) {
    const keys = Object.keys(input.metadata);
    if (keys.length > MAX_METADATA_KEYS) {
      errors.push({
        field: 'metadata',
        message: `Metadata must have ${MAX_METADATA_KEYS} keys or fewer`,
      });
    }
    const size = JSON.stringify(input.metadata).length;
    if (size > MAX_METADATA_SIZE) {
      errors.push({
        field: 'metadata',
        message: `Metadata must be ${MAX_METADATA_SIZE} bytes or less (got ${size})`,
      });
    }
  }

  // Tags
  if (input.tags) {
    if (input.tags.length > MAX_TAGS) {
      errors.push({
        field: 'tags',
        message: `Maximum ${MAX_TAGS} tags allowed`,
      });
    }
    for (const tag of input.tags) {
      if (tag.length > MAX_TAG_LENGTH) {
        errors.push({
          field: 'tags',
          message: `Tag "${tag}" exceeds ${MAX_TAG_LENGTH} character limit`,
        });
        break;
      }
    }
  }

  // Description
  if (input.description && input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
    });
  }

  // Error message
  if (input.errorMessage && input.errorMessage.length > MAX_ERROR_MESSAGE_LENGTH) {
    errors.push({
      field: 'errorMessage',
      message: `Error message must be ${MAX_ERROR_MESSAGE_LENGTH} characters or less`,
    });
  }

  // occurredAt
  if (input.occurredAt !== undefined) {
    const date = input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'occurredAt',
        message: 'occurredAt must be a valid date',
      });
    }
  }

  // Target
  if (input.target) {
    if (!input.target.type) {
      errors.push({ field: 'target.type', message: 'Target type is required when target is provided' });
    } else if (input.target.type.length > MAX_TARGET_TYPE_LENGTH) {
      errors.push({ field: 'target.type', message: `Target type must be ${MAX_TARGET_TYPE_LENGTH} characters or less` });
    }
    if (!input.target.id) {
      errors.push({ field: 'target.id', message: 'Target ID is required when target is provided' });
    } else if (input.target.id.length > MAX_TARGET_ID_LENGTH) {
      errors.push({ field: 'target.id', message: `Target ID must be ${MAX_TARGET_ID_LENGTH} characters or less` });
    }
    if (input.target.name && input.target.name.length > MAX_TARGET_NAME_LENGTH) {
      errors.push({ field: 'target.name', message: `Target name must be ${MAX_TARGET_NAME_LENGTH} characters or less` });
    }
    if (input.target.metadata) {
      const keys = Object.keys(input.target.metadata);
      if (keys.length > MAX_METADATA_KEYS) {
        errors.push({
          field: 'target.metadata',
          message: `Target metadata must have ${MAX_METADATA_KEYS} keys or fewer`,
        });
      }
      const size = JSON.stringify(input.target.metadata).length;
      if (size > MAX_METADATA_SIZE) {
        errors.push({
          field: 'target.metadata',
          message: `Target metadata must be ${MAX_METADATA_SIZE} bytes or less (got ${size})`,
        });
      }
    }
  }

  return errors;
}

export function isValidAction(action: string): boolean {
  return ACTION_PATTERN.test(action) && action.length <= MAX_ACTION_LENGTH;
}

export function isValidSeverity(severity: string): severity is AuditSeverity {
  return VALID_SEVERITIES.includes(severity as AuditSeverity);
}
