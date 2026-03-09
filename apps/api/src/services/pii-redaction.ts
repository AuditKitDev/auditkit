import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { redactionRules } from '../db/schema.js';

/**
 * Built-in PII patterns.
 */
export const BUILT_IN_PATTERNS: Record<string, string> = {
  email: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
  ip_address:
    '(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
  credit_card: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b',
  ssn: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
  phone: '\\b(?:\\+?1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b',
};

export interface RedactionRule {
  id: string;
  projectId: string;
  fieldPath: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
}

/**
 * Get a value from a nested object by dot-path.
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Set a value in a nested object by dot-path.
 */
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Apply a regex pattern to redact all string values in an object recursively.
 */
function redactAllFields(
  obj: Record<string, unknown>,
  regex: RegExp,
  replacement: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = value.replace(regex, replacement);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactAllFields(value as Record<string, unknown>, regex, replacement);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') return item.replace(regex, replacement);
        if (item !== null && typeof item === 'object') {
          return redactAllFields(item as Record<string, unknown>, regex, replacement);
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Redact PII from an event body based on the given rules.
 * Returns a new object with redacted values.
 */
export function redactEvent(
  event: Record<string, unknown>,
  rules: RedactionRule[]
): Record<string, unknown> {
  let result = structuredClone(event);

  const MAX_PATTERN_LENGTH = 500;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.pattern.length > MAX_PATTERN_LENGTH) {
      // Skip overly long patterns to prevent ReDoS
      continue;
    }

    let regex: RegExp;
    try {
      regex = new RegExp(rule.pattern, 'g');
    } catch {
      // Skip invalid regex
      continue;
    }

    if (rule.fieldPath === '*') {
      // Apply to all string fields recursively
      result = redactAllFields(result, regex, rule.replacement);
    } else {
      // Apply to specific field path
      const value = getByPath(result, rule.fieldPath);
      if (typeof value === 'string') {
        setByPath(result, rule.fieldPath, value.replace(regex, rule.replacement));
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        setByPath(
          result,
          rule.fieldPath,
          redactAllFields(value as Record<string, unknown>, regex, rule.replacement)
        );
      }
    }
  }

  return result;
}

/**
 * Load redaction rules for a project from the database.
 */
export async function loadRedactionRules(
  db: Database,
  projectId: string
): Promise<RedactionRule[]> {
  const rules = await db
    .select({
      id: redactionRules.id,
      projectId: redactionRules.projectId,
      fieldPath: redactionRules.fieldPath,
      pattern: redactionRules.pattern,
      replacement: redactionRules.replacement,
      enabled: redactionRules.enabled,
    })
    .from(redactionRules)
    .where(
      and(eq(redactionRules.projectId, projectId), eq(redactionRules.enabled, true))
    );

  return rules;
}
