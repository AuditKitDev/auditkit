/**
 * Natural Language Search Parser
 *
 * Parses natural language queries into structured filter objects
 * that can be used with the existing event query system.
 * No LLM/AI dependency — uses keyword matching and pattern recognition.
 */

export interface NLPFilters {
  action?: string;
  actor_id?: string;
  actor_name?: string;
  target_type?: string;
  target_id?: string;
  tenant_id?: string;
  severity?: string;
  from?: string;
  to?: string;
  query?: string;
  is_anomalous?: string;
}

// ============================================
// Action word mappings
// ============================================

const ACTION_VERBS: Record<string, string> = {
  deleted: 'delete',
  deleting: 'delete',
  removes: 'delete',
  removed: 'delete',
  created: 'create',
  creates: 'create',
  creating: 'create',
  added: 'create',
  updated: 'update',
  updates: 'update',
  updating: 'update',
  modified: 'update',
  changed: 'update',
  edited: 'update',
  viewed: 'view',
  views: 'view',
  viewing: 'view',
  read: 'view',
  accessed: 'access',
  logged: 'login',
  'logged in': 'login',
  'signed in': 'login',
  login: 'login',
  logins: 'login',
  'logged out': 'logout',
  'signed out': 'logout',
  logout: 'logout',
  invited: 'invite',
  exported: 'export',
  imported: 'import',
  uploaded: 'upload',
  downloaded: 'download',
  deployed: 'deploy',
  deployment: 'deploy',
  deployments: 'deploy',
  approved: 'approve',
  rejected: 'reject',
  denied: 'deny',
  revoked: 'revoke',
  suspended: 'suspend',
  enabled: 'enable',
  disabled: 'disable',
};

// ============================================
// Severity mappings
// ============================================

const SEVERITY_WORDS: Record<string, string> = {
  errors: 'error',
  error: 'error',
  critical: 'critical',
  severe: 'error',
  warnings: 'warning',
  warning: 'warning',
  warn: 'warning',
  info: 'info',
  informational: 'info',
  low: 'info',
  debug: 'debug',
};

// ============================================
// Target type mappings
// ============================================

const TARGET_TYPES: Record<string, string> = {
  documents: 'document',
  document: 'document',
  docs: 'document',
  doc: 'document',
  files: 'file',
  file: 'file',
  users: 'user',
  user: 'user',
  accounts: 'account',
  account: 'account',
  roles: 'role',
  role: 'role',
  permissions: 'permission',
  permission: 'permission',
  projects: 'project',
  project: 'project',
  teams: 'team',
  team: 'team',
  organizations: 'organization',
  organization: 'organization',
  orgs: 'organization',
  org: 'organization',
  keys: 'api_key',
  'api keys': 'api_key',
  'api key': 'api_key',
  webhooks: 'webhook',
  webhook: 'webhook',
  settings: 'setting',
  setting: 'setting',
  configs: 'config',
  config: 'config',
  configurations: 'config',
  configuration: 'config',
};

// ============================================
// Permission/admin related action patterns
// ============================================

const ADMIN_PATTERNS = ['admin', 'administrative', 'administrator'];
const PERMISSION_PATTERNS = ['permission', 'role', 'access', 'privilege', 'grant', 'policy'];

// ============================================
// Time parsing
// ============================================

function parseTimeRange(text: string): { from?: string; to?: string } {
  const now = new Date();
  const lowerText = text.toLowerCase();

  // "today"
  if (/\btoday\b/.test(lowerText)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }

  // "yesterday"
  if (/\byesterday\b/.test(lowerText)) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  // "last N hours"
  const hoursMatch = lowerText.match(/\blast\s+(\d+)\s+hours?\b/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return { from: start.toISOString() };
  }

  // "last N days"
  const daysMatch = lowerText.match(/\blast\s+(\d+)\s+days?\b/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { from: start.toISOString() };
  }

  // "last week"
  if (/\blast\s+week\b/.test(lowerText)) {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { from: start.toISOString() };
  }

  // "last month"
  if (/\blast\s+month\b/.test(lowerText)) {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return { from: start.toISOString() };
  }

  // "this week"
  if (/\bthis\s+week\b/.test(lowerText)) {
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }

  // "this month"
  if (/\bthis\s+month\b/.test(lowerText)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString() };
  }

  // "this year"
  if (/\bthis\s+year\b/.test(lowerText)) {
    const start = new Date(now.getFullYear(), 0, 1);
    return { from: start.toISOString() };
  }

  // "last year"
  if (/\blast\s+year\b/.test(lowerText)) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear(), 0, 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  // Month names: "in January", "January 2025", "in January 2025"
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  for (let i = 0; i < months.length; i++) {
    const monthRegex = new RegExp(`\\b${months[i]}(?:\\s+(\\d{4}))?\\b`, 'i');
    const monthMatch = lowerText.match(monthRegex);
    if (monthMatch) {
      const year = monthMatch[1] ? parseInt(monthMatch[1], 10) : now.getFullYear();
      const start = new Date(year, i, 1);
      const end = new Date(year, i + 1, 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }
  }

  // Standalone year: "in 2025"
  const yearMatch = lowerText.match(/\bin\s+(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  return {};
}

// ============================================
// Main parser
// ============================================

export function parseNaturalLanguageQuery(query: string): NLPFilters {
  const filters: NLPFilters = {};
  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);

  // --- Extract time range ---
  const timeRange = parseTimeRange(lowerQuery);
  if (timeRange.from) filters.from = timeRange.from;
  if (timeRange.to) filters.to = timeRange.to;

  // --- Extract severity ---
  for (const word of words) {
    if (SEVERITY_WORDS[word]) {
      filters.severity = SEVERITY_WORDS[word];
      break;
    }
  }

  // --- Extract action verbs ---
  for (const word of words) {
    if (ACTION_VERBS[word]) {
      filters.action = `*${ACTION_VERBS[word]}*`;
      break;
    }
  }
  // Also check two-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    if (ACTION_VERBS[twoWord]) {
      filters.action = `*${ACTION_VERBS[twoWord]}*`;
      break;
    }
  }

  // --- Extract admin/permission patterns ---
  if (!filters.action) {
    for (const pattern of ADMIN_PATTERNS) {
      if (lowerQuery.includes(pattern)) {
        filters.action = '*admin*';
        break;
      }
    }
  }
  if (!filters.action) {
    for (const pattern of PERMISSION_PATTERNS) {
      if (lowerQuery.includes(pattern)) {
        filters.action = '*permission*';
        break;
      }
    }
  }

  // --- Extract target type ---
  for (const [keyword, targetType] of Object.entries(TARGET_TYPES)) {
    if (lowerQuery.includes(keyword)) {
      filters.target_type = targetType;
      break;
    }
  }

  // --- Extract tenant from "in org_xxx" or "in tenant_xxx" patterns ---
  const tenantMatch = lowerQuery.match(/\bin\s+(org_\w+|tenant_\w+)\b/);
  if (tenantMatch) {
    filters.tenant_id = tenantMatch[1];
  }

  // --- Extract actor name from "by <name>" or "from user <name>" or "from <name>" patterns ---
  const byMatch = lowerQuery.match(/\b(?:by|from)\s+(?:user\s+)?(\w+)\b/);
  if (byMatch) {
    const name = byMatch[1];
    // Don't match common words as actor names
    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'user', 'admin',
      'last', 'this', 'that', 'today', 'yesterday', 'all', 'any', 'every', 'org',
    ]);
    if (!stopWords.has(name) && !SEVERITY_WORDS[name] && !TARGET_TYPES[name]) {
      filters.actor_name = name;
    }
  }

  // --- Extract "who" queries (actor-focused) ---
  if (lowerQuery.startsWith('who ')) {
    // "who deleted documents" — action already parsed above
    // Set query for full-text search as fallback
  }

  // --- Anomaly detection ---
  if (/\banomal(?:y|ies|ous)\b/.test(lowerQuery) || /\bsuspicious\b/.test(lowerQuery)) {
    filters.is_anomalous = 'true';
  }

  // --- Fallback: use remaining meaningful words as full-text query ---
  const meaningfulWords = words.filter((w) => {
    const stopWords = new Set([
      'show', 'me', 'all', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for',
      'and', 'or', 'of', 'from', 'by', 'with', 'who', 'what', 'when', 'where',
      'find', 'get', 'list', 'search', 'display', 'give', 'tell',
      'last', 'this', 'that', 'those', 'these',
    ]);
    return !stopWords.has(w) &&
      !SEVERITY_WORDS[w] &&
      !ACTION_VERBS[w] &&
      !TARGET_TYPES[w] &&
      !ADMIN_PATTERNS.includes(w) &&
      !PERMISSION_PATTERNS.includes(w) &&
      w.length > 2;
  });

  // Only set query if we have leftover meaningful words and didn't parse everything
  if (meaningfulWords.length > 0 && !filters.action && !filters.severity && !filters.target_type) {
    filters.query = meaningfulWords.join(' ');
  }

  return filters;
}
