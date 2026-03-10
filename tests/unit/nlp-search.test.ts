import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageQuery } from '../../apps/api/src/services/nlp-search.js';

describe('parseNaturalLanguageQuery', () => {
  // Action extraction
  it('extracts delete action from "deleted"', () => {
    const f = parseNaturalLanguageQuery('who deleted documents last week');
    expect(f.action).toBe('*delete*');
  });

  it('extracts create action from "created"', () => {
    const f = parseNaturalLanguageQuery('show all created files');
    expect(f.action).toBe('*create*');
  });

  it('extracts login action from "logged in"', () => {
    const f = parseNaturalLanguageQuery('users who logged in today');
    expect(f.action).toBe('*login*');
  });

  it('extracts export action from "exported"', () => {
    const f = parseNaturalLanguageQuery('find exported data');
    expect(f.action).toBe('*export*');
  });

  // Severity extraction
  it('extracts error severity', () => {
    const f = parseNaturalLanguageQuery('show error events');
    expect(f.severity).toBe('error');
  });

  it('extracts critical severity', () => {
    const f = parseNaturalLanguageQuery('list critical alerts');
    expect(f.severity).toBe('critical');
  });

  it('maps "warnings" to warning', () => {
    const f = parseNaturalLanguageQuery('show me warnings');
    expect(f.severity).toBe('warning');
  });

  // Target type extraction
  it('extracts document target', () => {
    const f = parseNaturalLanguageQuery('deleted documents');
    expect(f.target_type).toBe('document');
  });

  it('extracts user target from "users"', () => {
    const f = parseNaturalLanguageQuery('show all users');
    expect(f.target_type).toBe('user');
  });

  it('extracts api_key target from "api keys"', () => {
    const f = parseNaturalLanguageQuery('list api keys');
    expect(f.target_type).toBe('api_key');
  });

  // Time range extraction
  it('parses "today"', () => {
    const f = parseNaturalLanguageQuery('events today');
    expect(f.from).toBeDefined();
    const fromDate = new Date(f.from!);
    expect(fromDate.getHours()).toBe(0);
    expect(fromDate.getMinutes()).toBe(0);
  });

  it('parses "yesterday"', () => {
    const f = parseNaturalLanguageQuery('events yesterday');
    expect(f.from).toBeDefined();
    expect(f.to).toBeDefined();
  });

  it('parses "last 7 days"', () => {
    const f = parseNaturalLanguageQuery('events in last 7 days');
    expect(f.from).toBeDefined();
    const fromDate = new Date(f.from!);
    const diff = Date.now() - fromDate.getTime();
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(8 * 24 * 60 * 60 * 1000);
  });

  it('parses "last 24 hours"', () => {
    const f = parseNaturalLanguageQuery('show last 24 hours');
    expect(f.from).toBeDefined();
    const diff = Date.now() - new Date(f.from!).getTime();
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it('parses "last week"', () => {
    const f = parseNaturalLanguageQuery('events last week');
    expect(f.from).toBeDefined();
  });

  it('parses "last month"', () => {
    const f = parseNaturalLanguageQuery('events last month');
    expect(f.from).toBeDefined();
  });

  it('parses "this week"', () => {
    const f = parseNaturalLanguageQuery('events this week');
    expect(f.from).toBeDefined();
  });

  it('parses "this month"', () => {
    const f = parseNaturalLanguageQuery('events this month');
    expect(f.from).toBeDefined();
  });

  it('parses month name "January"', () => {
    const f = parseNaturalLanguageQuery('events in January');
    expect(f.from).toBeDefined();
    expect(f.to).toBeDefined();
    expect(new Date(f.from!).getMonth()).toBe(0); // January
  });

  it('parses month name with year "March 2025"', () => {
    const f = parseNaturalLanguageQuery('events in March 2025');
    expect(f.from).toBeDefined();
    const d = new Date(f.from!);
    expect(d.getMonth()).toBe(2); // March
    expect(d.getFullYear()).toBe(2025);
  });

  // Actor extraction
  it('extracts actor name from "by john"', () => {
    const f = parseNaturalLanguageQuery('documents deleted by john');
    expect(f.actor_name).toBe('john');
  });

  it('extracts actor name from "from alice"', () => {
    const f = parseNaturalLanguageQuery('actions from alice');
    expect(f.actor_name).toBe('alice');
  });

  it('does not extract stop words as actor name', () => {
    const f = parseNaturalLanguageQuery('events from the last week');
    expect(f.actor_name).toBeUndefined();
  });

  // Tenant extraction
  it('extracts tenant from "in org_abc"', () => {
    const f = parseNaturalLanguageQuery('events in org_abc');
    expect(f.tenant_id).toBe('org_abc');
  });

  it('extracts tenant from "in tenant_xyz"', () => {
    const f = parseNaturalLanguageQuery('events in tenant_xyz');
    expect(f.tenant_id).toBe('tenant_xyz');
  });

  // Anomaly extraction
  it('detects anomaly keyword', () => {
    const f = parseNaturalLanguageQuery('show anomalous events');
    expect(f.is_anomalous).toBe('true');
  });

  it('detects suspicious keyword', () => {
    const f = parseNaturalLanguageQuery('find suspicious activity');
    expect(f.is_anomalous).toBe('true');
  });

  it('detects anomalies keyword', () => {
    const f = parseNaturalLanguageQuery('list anomalies');
    expect(f.is_anomalous).toBe('true');
  });

  // Admin/permission patterns
  it('matches admin pattern', () => {
    const f = parseNaturalLanguageQuery('show admin actions');
    expect(f.action).toBe('*admin*');
  });

  it('matches permission pattern', () => {
    const f = parseNaturalLanguageQuery('show permission changes');
    expect(f.action).toBe('*permission*');
  });

  // Combined queries
  it('handles complex query', () => {
    const f = parseNaturalLanguageQuery('show critical errors from john last 7 days');
    expect(f.severity).toBe('critical');
    expect(f.actor_name).toBe('john');
    expect(f.from).toBeDefined();
  });

  // Edge cases
  it('handles empty query', () => {
    const f = parseNaturalLanguageQuery('');
    expect(f).toEqual({});
  });

  it('handles query with only stop words', () => {
    const f = parseNaturalLanguageQuery('show me all the events');
    expect(f.action).toBeUndefined();
    expect(f.severity).toBeUndefined();
  });
});
