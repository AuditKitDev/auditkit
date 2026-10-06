// Site-wide facts. Anything marked [OWNER: …] needs the owner's decision; the same list lives in OWNER-TODO.md.
export const SITE_NAME = "AuditKit";
export const SITE_URL = "https://auditkit.dev";
export const API_URL = "https://api.auditkit.dev";
export const REPO_URL = "https://github.com/AuditKitDev/auditkit"; // v2 lands here on a branch until merged (OWNER-TODO 7)
export const SUPPORT_EMAIL = "support@auditkit.dev"; // [OWNER: confirm support mailbox]
export const SECURITY_EMAIL = "security@auditkit.dev"; // [OWNER: confirm security mailbox]
export const LEGAL_NAME = "[OWNER: company legal name]";
export const LEGAL_JURISDICTION = "[OWNER: governing law / jurisdiction]";
export const DATA_LOCATION = "[OWNER: fill — VPS region, EU or US]";
export const STATUS_URL = "/anchors"; // [OWNER: status page URL; /anchors is the live proof of service until one exists]
export const LAST_UPDATED = "2026-10-05";
/** YAML `date: 2026-10-05` reaches layouts as a Date; render it as the day, not the full ISO string. */
export const isoDay = (d: string | Date): string => new Date(d).toISOString().slice(0, 10);
export const TAGLINE = "Tamper-evident audit logs your auditor can verify without trusting AuditKit.";
export const SUBLINE = "Every event is hash-chained, signed on ingest, rolled into Merkle roots and anchored to Sigstore Rekor and OpenTimestamps. The verifier runs offline. Our servers can be gone and the proof still holds.";
