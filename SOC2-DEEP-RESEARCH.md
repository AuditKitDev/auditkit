# AuditKit x SOC 2: Deep Research & Feature Roadmap

> Research date: 2026-03-31 (updated with market research)
> Purpose: Define how AuditKit helps ANY company prepare for SOC 2 audits — gathering evidence, organizing systems info, and delivering it to auditors.

---

## The AuditKit Philosophy

**We don't do audits. We make audits easier.**

AuditKit is the customer's tool to get organized and ready. We help them:
1. **Understand** what auditors will ask for
2. **Gather** evidence from their systems automatically
3. **Organize** it so auditors can find what they need
4. **Prove** the evidence hasn't been tampered with (our unique moat)

We are **friends of auditors** — our intent is to help customers tell the truth, be ready, and make the audit process smooth for everyone. We don't game audits. We don't generate fake evidence. We make it easy to collect and present real evidence.

---

## Table of Contents

1. [The Problem We Solve](#1-the-problem-we-solve)
2. [What AuditKit Already Has](#2-what-auditkit-already-has)
3. [Market Reality](#3-market-reality)
4. [Feature Roadmap (ROI-Ranked)](#4-feature-roadmap-roi-ranked)
5. [What We Don't Build](#5-what-we-dont-build)
6. [Competitive Position](#6-competitive-position)
7. [Integration Strategy](#7-integration-strategy)
8. [Pricing Strategy](#8-pricing-strategy)
9. [Implementation Plan](#9-implementation-plan)
10. [Auditor Evidence Checklist](#10-auditor-evidence-checklist)
11. [Database Schema](#11-database-schema)

---

## 1. The Problem We Solve

### What SOC 2 Prep Actually Looks Like

Companies spend **100-500 hours** manually gathering evidence for auditors. That's the #1 pain point — not understanding the framework, not writing policies — just **collecting and organizing the damn evidence**.

Here's what auditors request and how companies currently handle it:

| Evidence Type | What Auditors Want | How Companies Do It Today |
|---|---|---|
| **Access lists** | Full user list for every in-scope system | Manually screenshot each admin console |
| **Access reviews** | Quarterly review records with approve/revoke decisions | Spreadsheets, often missed |
| **Change management** | Every code change during audit period with approval evidence | Export from GitHub/Jira, format manually |
| **Incident response** | IRP document + actual incident logs + post-mortems | Scattered across Slack, PagerDuty, Google Docs |
| **Vulnerability scans** | Internal/external scan results + remediation evidence | Run scans, save PDFs, hope they find them later |
| **HR records** | Background checks, training completion, policy acknowledgments | HR system exports + manual tracking |
| **Vendor inventory** | Vendor list with risk classifications + SOC 2 reports on file | Spreadsheets |
| **Risk assessment** | Annual risk assessment + risk register + treatment plans | More spreadsheets |
| **Policies** | 15-20 written security policies, reviewed annually | Google Docs, version history as "proof" |
| **System description** | Detailed narrative of architecture, people, processes | Written from scratch each audit |

### What Catches Companies Off Guard

1. **Population requests** — Auditors want the FULL list first (every change, every employee, every access grant), then they sample. Companies can't generate "every change made in the last 12 months" easily.
2. **Consistency over time** — One missed quarterly access review = exception. One change without a ticket = exception. Must be consistent across the entire 3-12 month observation period.
3. **Evidence format** — Screenshots without context trigger more questions. Auditors want timestamps, system-generated reports, clear linkage between evidence and the control it proves.
4. **Subservice organizations** — 89.6% of SOC 2 reports now include subservice providers. Companies are surprised they need to document vendor compliance too.
5. **The System Description** — A detailed narrative document required before the audit starts. Many companies don't know this exists until the auditor asks for it.

### The Burnout Problem

- 47% of security professionals report burnout
- 76% reported cyber fatigue in the last year
- Manual compliance tasks (log reviews, evidence gathering, access reviews) are cited as the primary contributor
- 4.8M cybersecurity workforce shortfall globally
- Companies need tools that reduce the tedium, not add to it

### Who Needs This (Not Just SaaS Companies)

SOC 2 is expanding far beyond tech:
- **Financial services** — handling client financial data
- **Healthcare** — HIPAA + SOC 2 for business associates
- **Legal** — client data protection, attorney-client privilege
- **BPOs / call centers** — processing client customer data
- **Education** — student data (FERPA + SOC 2)
- **Staffing agencies** — employee/candidate data across clients
- **Government contractors** — FedRAMP + SOC 2 overlap
- **Any company with enterprise clients** — SOC 2 is table stakes for B2B sales

Current tools (Vanta, Drata) are built for SaaS companies with AWS/GitHub/Okta stacks. Non-tech companies are underserved.

---

## 2. What AuditKit Already Has

AuditKit's existing features map directly to several SOC 2 evidence requirements:

### Strong Coverage (Ready to Package for SOC 2)

| SOC 2 Control | AuditKit Feature | Evidence Value |
|---|---|---|
| **CC7.1-CC7.2** — Monitoring & detection | Anomaly detection with baselines, scoring, alerts | Proves continuous monitoring was active |
| **CC6.1** — Logical access | API key scopes, session auth, RBAC (owner/admin/member) | Proves access controls exist |
| **CC6.6** — Encryption in transit | TLS enforced, CORS config | Proves data protection in transit |
| **CC6.7** — Encryption at rest | AES-256-GCM for SIEM creds, Ed25519 signing keys encrypted | Proves data protection at rest |
| **CC8.1** — Change management evidence | Hash-chained audit trail, Merkle proofs, event signing | Proves changes are logged with cryptographic integrity |
| **CC7.3-CC7.4** — Incident response | SIEM streaming (Splunk, Datadog, Elastic), notification rules | Proves incident detection and escalation capability |
| **C1.2** — Confidentiality disposal | Retention policies with legal hold, auto-deletion cron | Proves data lifecycle management |
| **PI1** — Processing integrity | Hash chain verification, Merkle tree proofs, tamper detection | **UNIQUE: Mathematically proves evidence integrity** |

### The Moat: Tamper-Proof Evidence

This is what no competitor has. When AuditKit collects evidence:
- Every piece of evidence is **hash-chained** (SHA-256)
- Evidence sets get **Merkle proofs** (prove nothing was added, removed, or altered)
- Events are **signed with Ed25519** (prove the source)

An auditor can independently verify that the evidence they're looking at hasn't been tampered with since collection. No other compliance platform offers this. After the Delve scandal (494 fake SOC 2 reports from a $32M startup), auditors and buyers are hungry for evidence integrity.

---

## 3. Market Reality

### What Companies Spend on SOC 2

| Company Size | First Year Total | Annual Renewal | Where the Money Goes |
|---|---|---|---|
| 5-person startup | $20K-$60K | $15K-$40K | Auditor ($5-15K) + tools ($5-15K) + consultant ($0-20K) + internal time (100-200 hrs) |
| 50-person company | $60K-$150K | $40K-$80K | Auditor ($20-40K) + tools ($15-30K) + consultant ($10-40K) + internal time (200-500 hrs) |
| 500-person enterprise | $200K-$500K+ | $100K-$300K | Auditor ($40-100K) + tools ($30-75K) + team (1-3 FTEs) + pen test ($25-50K) |

### The Price Gap Nobody Fills

| Tier | Who Serves It | Price |
|---|---|---|
| Enterprise ($50K+/yr) | Vanta Enterprise, Drata, OneTrust | Well served |
| Mid-market ($10K-$50K/yr) | Vanta, Drata, Secureframe, Sprinto | Competitive |
| **Small company ($1K-$5K/yr)** | **Nobody** | **Wide open** |
| **Solo/micro ($50-$200/mo)** | **Nobody** | **Wide open** |

### Why Competitors Are Losing Goodwill

Real complaints from users (G2, Reddit, Hacker News):

**Vanta ($4.15B valuation, 12K customers):**
- "Locked into a two-year agreement...refused to allow an early exit"
- 40% price jumps at renewal
- "Risk management so limited we made it in Excel"
- Data leak in 2025 exposed customer data to OTHER customers
- Access reviews are a paid add-on

**Drata ($2B valuation, $100M ARR):**
- Renewal quotes jumping from $7.5K to $20K "just to turn on two frameworks"
- "No risk assessment capability — documents risks but can't assess them"
- Filter resets, UI quirks

**Sprinto:**
- "Predatory pricing" — great first-year deals, then 60%+ renewal increases
- Less integration depth

**Universal complaints across ALL tools:**
1. Pricing opacity (nobody publishes prices)
2. Renewal sticker shock
3. Essential features gated behind add-ons
4. Shallow automation — surfaces issues but doesn't fix them
5. Poor scaling past 50 employees
6. Audit fees NOT included in platform pricing

### The Delve Scandal (March 2026) — Our Opportunity

Y Combinator-backed Delve ($32M raised) was exposed for generating **494 fake SOC 2 reports**:
- 99.8% identical boilerplate language across "audits"
- Keyboard-mashed test values ("sdf," "dlkjf") appearing in final reports
- "Auditors" traced to certification mills
- Destroyed trust in compliance automation industry

This is a gift for AuditKit. Our tamper-proof evidence (hash chains, Merkle proofs, event signing) is the antidote to fake compliance. We help customers tell the truth — and we can prove the truth hasn't been altered.

### Multi-Framework Is Table Stakes

65-80% of controls overlap across major frameworks:
- SOC 2 + ISO 27001: ~80% overlap
- SOC 2 + HIPAA: ~70% overlap
- SOC 2 + GDPR: ~60% overlap

Companies start with SOC 2, then need ISO 27001, then HIPAA. If AuditKit maps controls once and applies across frameworks, we save customers massive rework. But **SOC 2 is the entry point** — ship that first, extend to other frameworks later.

---

## 4. Feature Roadmap (ROI-Ranked)

Every feature is evaluated against three questions:
1. **Does it help customers gather evidence?** (core value)
2. **Does it fit into the existing app?** (pnpm monorepo, Hono API, Next.js dashboard, Drizzle/Neon)
3. **Will customers pay for it?** (ROI)

### P0 — "Evidence Collection Engine" (Highest ROI, Ship First)

These features directly solve the #1 pain point: gathering and organizing evidence for auditors.

#### 4.1 Evidence Vault

**What it does**: Central place to store, organize, and deliver all audit evidence. Think "Google Drive but purpose-built for auditor evidence requests."

**Why customers pay for it**: Replaces the "folder of screenshots on Google Drive" approach. Auditors get a clean, organized view. Customers never lose evidence again.

**What it includes**:
- Upload evidence (screenshots, PDFs, CSVs, links)
- Tag evidence to SOC 2 controls (CC1-CC9, A1, PI1, C1, P1-P8)
- Auto-timestamp and hash every upload (tamper-proof!)
- Track evidence gaps (which controls still need evidence?)
- Evidence freshness alerts (quarterly evidence that's 4+ months old)
- Auditor-ready export (zip package organized by control)

**Fits into the app**: New tables (`evidence`, `evidence_tags`), new dashboard page (`/dashboard/evidence`), new API routes. Uses existing S3/MinIO infrastructure for file storage.

**Revenue justification**: This is the foundation. Every other feature generates evidence that flows into the vault. Without this, we're just an audit log — with it, we're an audit prep platform.

#### 4.2 Control Catalog & Readiness Dashboard

**What it does**: Pre-built catalog of SOC 2 controls mapped to Trust Service Criteria. Shows customers exactly what auditors will check, what evidence they need, and how ready they are.

**Why customers pay for it**: "Nobody knows where to start" is the #2 pain point. This gives them a checklist that maps directly to what auditors request.

**What it includes**:
- Pre-built SOC 2 control catalog (CC1-CC9 + optional criteria)
- Each control shows: what it requires, what evidence to collect, who owns it
- Readiness status per control (not started / in progress / ready / verified)
- Overall readiness percentage
- Evidence linked to each control (from the Evidence Vault)
- Gap report: "You're 72% ready. Here's what's missing."

**Fits into the app**: New tables (`controls`, `control_frameworks`), extends `/dashboard/compliance`. Pre-seed from a JSON definition file.

**Revenue justification**: This is what Vanta charges $10K+ for. AuditKit can offer it at $99-$299/mo because it maps to our existing audit event infrastructure.

#### 4.3 Policy Template Library

**What it does**: Pre-written security policies that customers customize and track. Auditors need 15-20 written policies, reviewed annually, acknowledged by employees.

**Why customers pay for it**: Policy creation is the #1 time sink after evidence collection. Companies pay $5K-$15K to consultants just for policy writing.

**What it includes**:
- 15+ pre-written SOC 2 policy templates (markdown)
  - Information Security Policy
  - Acceptable Use Policy
  - Change Management Policy
  - Incident Response Plan
  - Access Control Policy
  - Data Retention Policy
  - Vendor Management Policy
  - Business Continuity Plan
  - Risk Assessment Methodology
  - Data Classification Policy
  - Encryption Policy
  - Password Policy
  - Remote Work Policy
  - Physical Security Policy
  - Privacy Policy
- Version tracking (what changed, who approved, when)
- Employee acknowledgment tracking (who signed, when, reminders)
- Annual review reminders
- PDF export for auditor submission

**Fits into the app**: New tables (`policies`, `policy_versions`, `policy_acknowledgments`), templates stored as MDX in `packages/shared/src/policy-templates/`, new dashboard page `/dashboard/policies`.

**Revenue justification**: Immediate value. Customer signs up, gets 15 policies they can customize in an afternoon instead of spending weeks writing from scratch.

### P1 — "Automate the Tedium" (Ship Second)

These features automate the evidence collection that currently takes 100-500 hours.

#### 4.4 Access Review Campaigns

**What it does**: Quarterly access reviews — the most tedious recurring SOC 2 task. Pull user lists from connected systems, assign reviewers, track approve/revoke decisions.

**Why customers pay for it**: Access reviews are done in spreadsheets. Missed reviews = audit exceptions. Vanta charges extra for this as an add-on.

**What it includes**:
- Create access review campaigns (quarterly, scheduled)
- Pull user lists from identity providers (Okta, Azure AD, Google Workspace)
- Reviewer assignment and approval workflow
- Approve / revoke / flag decisions per user per system
- Historical review records (auditors sample these)
- Auto-detect stale/unused accounts
- Evidence auto-saved to Evidence Vault

**Fits into the app**: New tables (`access_reviews`, `access_review_entries`), new integrations (OAuth read-only to identity providers), new page `/dashboard/access-reviews`.

**Revenue justification**: Vanta charges this as a paid add-on. We include it in Pro tier. Immediate competitive differentiation.

#### 4.5 Vendor Inventory & Risk Tracking

**What it does**: Track vendors, their risk level, whether they have SOC 2 reports on file, when those reports expire.

**Why customers pay for it**: 89.6% of SOC 2 reports now include subservice providers. Auditors will ask for vendor inventory. Only 56% of companies use any TPRM technology — the rest use spreadsheets.

**What it includes**:
- Vendor registry (name, category, criticality, data access level)
- SOC 2 report upload and expiration tracking per vendor
- DPA/BAA document storage
- Annual review reminders
- Simple risk scoring (criticality x data access)
- No complex vendor questionnaires (keep it simple)

**Fits into the app**: New tables (`vendors`, `vendor_documents`), new page `/dashboard/vendors`.

**Revenue justification**: Simple feature, high value. Replaces the "vendor spreadsheet" that every company maintains.

#### 4.6 Risk Register

**What it does**: Document risks, score them (likelihood x impact), track treatment plans. Auditors require this annually.

**Why customers pay for it**: Vanta's risk management is "so limited we made it in Excel." Drata "documents risks but can't assess them." This is a known gap.

**What it includes**:
- Risk register with categories (security, operational, compliance, financial)
- Risk matrix (likelihood x impact = risk score)
- Treatment plans (accept, mitigate, transfer, avoid)
- Risk owners and review dates
- Connection to anomaly detection (anomalies can auto-flag risks)
- Annual risk assessment evidence (auto-saved to Evidence Vault)

**Fits into the app**: New tables (`risks`, `risk_treatments`), new page `/dashboard/risks`. Connects to existing `anomaly_alerts`.

#### 4.7 System Description Generator

**What it does**: Guided builder for the System Description document that auditors require. This is the detailed narrative about architecture, people, data flow, and controls.

**Why customers pay for it**: The System Description catches companies off guard. It must exist before the audit starts. Many companies don't know it's required until the auditor asks.

**What it includes**:
- Guided questionnaire: "What does your product do? What infrastructure do you use? Who has access?"
- Pre-written sections for common architectures (AWS, GCP, Azure, Vercel, etc.)
- Auto-populate from connected integrations where possible
- Markdown output with version tracking
- PDF export for auditor

**Fits into the app**: Can be a wizard flow within `/dashboard/compliance` that generates a policy-like document.

### P2 — "Make It Sticky" (Ship Third)

#### 4.8 Auditor Collaboration Portal

**What it does**: Read-only access for audit firms. Auditors can see evidence, controls, policies — ask questions, request additional evidence — all in one place.

**Why customers pay for it**: Replaces email chains and shared drives. Reduces audit fieldwork time, which reduces audit COST for the customer.

**What it includes**:
- Scoped read-only access for auditor users
- Evidence organized by control
- Comment/question threads per control
- Evidence request workflow (auditor requests → customer uploads)
- Audit period filtering
- Export packages

**Revenue justification**: This makes the audit faster and cheaper. If using AuditKit saves the customer $5K-$10K on audit fees, the platform pays for itself.

#### 4.9 Incident Response Tracker

**What it does**: Track security incidents with severity, timeline, RCA. Links to anomaly alerts.

**What it includes**:
- Incident creation with severity (P0-P4)
- Timeline tracking (detected → acknowledged → mitigated → resolved → RCA)
- Communication log
- Post-incident review template
- Auto-create from critical anomaly alerts
- Evidence auto-saved to Evidence Vault

#### 4.10 Personnel / HR Evidence Tracker

**What it does**: Track the HR evidence auditors need — background checks, training, policy acknowledgments, onboarding/offboarding.

**What it includes**:
- Employee directory with hire/termination dates
- Background check completion tracking
- Security training completion tracking
- Onboarding/offboarding checklists
- Links to policy acknowledgments

#### 4.11 Trust Center

**What it does**: Public-facing page showing compliance status, certifications, and self-serve SOC 2 report requests.

**Why customers pay for it**: Reduces sales cycle friction by 2-4 weeks per deal. Deflects security questionnaires. Drata paid $250M to acquire SafeBase for this feature alone.

### P3 — "Continuous Compliance" (Longer Term)

#### 4.12 Integration-Based Evidence Collection

Auto-collect evidence from connected systems:
- **GitHub/GitLab**: Branch protection status, PR review evidence, change populations
- **AWS CloudTrail**: Infrastructure audit logs, config changes
- **Okta / Azure AD / Google Workspace**: User lists, MFA status, provisioning logs
- **Jira / Linear**: Change management tickets
- **PagerDuty / OpsGenie**: Incident management evidence

Each integration auto-feeds evidence into the Evidence Vault, tagged to the relevant control.

#### 4.13 Continuous Control Monitoring

Real-time checks that alert when controls drift:
- MFA disabled for a user
- Branch protection removed
- Access review overdue
- Policy review overdue
- Vendor SOC 2 report expired
- Training not completed

---

## 5. What We Don't Build

Staying focused. These are out of scope:

| Don't Build | Why |
|---|---|
| **The audit itself** | We're not auditors. We help prep. Auditors are partners, not competitors. |
| **Fake or inflated evidence** | We prove truth. After Delve, this is our competitive advantage. |
| **Auto-remediation** | Too risky, too complex. Surface the issue, let humans fix it. |
| **Full GRC platform** | We're not OneTrust. We solve SOC 2 prep. Expand frameworks later, but stay focused. |
| **Compliance-as-code** | Cool but niche. Most customers aren't developers. Ship the dashboard first. |
| **Questionnaire automation** | Important but not core. Add later or integrate with Conveyor. |
| **MDM / endpoint management** | Out of scope. Integrate with Jamf/Intune, don't replace them. |

---

## 6. Competitive Position

### Current Landscape

| Tool | Price | Strength | Weakness | AuditKit Angle |
|---|---|---|---|---|
| **Vanta** | $10K-$50K/yr | Brand, 300+ integrations | Expensive, lock-in, data leak, shallow risk mgmt | 10x cheaper, transparent pricing, tamper-proof evidence |
| **Drata** | $7K-$50K/yr | Best product, SafeBase trust center | Renewal shock, no risk assessment | Affordable alternative with evidence integrity |
| **Secureframe** | $7.5K-$40K/yr | FedRAMP niche, good onboarding | Scales poorly, few customers (~$6M revenue) | Better for general SOC 2, not niche |
| **Sprinto** | $7K-$25K/yr | Budget option | Renewal bait-and-switch, shallow features | Honest pricing, deeper features |
| **CISO Assistant** | Free (OSS) | 130+ frameworks, 3.9K stars | No polish, no support, DIY | Managed service with support |
| **Spreadsheets** | Free | Everyone knows Excel | Zero automation, error-prone, no audit trail | Automate everything the spreadsheet can't |

### AuditKit's Unique Value Props

1. **Tamper-proof evidence** — Hash chains + Merkle proofs + Ed25519 signing. Nobody else has this. Post-Delve, this matters.
2. **Transparent pricing** — Published prices, no sales calls, monthly billing. Every competitor hides pricing.
3. **Developer-first** — SDKs, API-first, CI/CD integration. Competitors are built for compliance teams.
4. **Affordable** — $99-$499/mo vs $7K-$50K/yr. 80% cheaper.
5. **Honest** — We help you tell the truth better, not game the audit.

### Positioning Statement

> "AuditKit: Get SOC 2 ready without the $50K price tag. Collect evidence, organize controls, and deliver tamper-proof audit packages — at a price startups can actually afford."

---

## 7. Integration Strategy

### Priority Order (by evidence value to auditors)

**Phase 1 — Identity & Access (Highest evidence demand)**
| Integration | Evidence It Provides | SOC 2 Control |
|---|---|---|
| **Google Workspace** | User directory, MFA status, admin logs | CC6 — Access |
| **Okta** | User provisioning, MFA, access reviews | CC6 — Access |
| **Azure AD / Entra ID** | Identity provider, access reviews | CC6 — Access |

**Phase 2 — Development & Change Management**
| Integration | Evidence It Provides | SOC 2 Control |
|---|---|---|
| **GitHub** | PR reviews, branch protection, change populations | CC8 — Change Mgmt |
| **GitLab** | Same as GitHub | CC8 — Change Mgmt |
| **Jira / Linear** | Change tickets, incident tickets | CC8, CC7 |

**Phase 3 — Infrastructure & Security**
| Integration | Evidence It Provides | SOC 2 Control |
|---|---|---|
| **AWS CloudTrail** | Infrastructure audit logs | CC7 — Operations |
| **PagerDuty** | Incident management evidence | CC7 — Operations |
| **Datadog / Splunk** | Monitoring config evidence | CC7 — Operations |

**Phase 4 — HR & People**
| Integration | Evidence It Provides | SOC 2 Control |
|---|---|---|
| **BambooHR / Gusto / Rippling** | Employee lifecycle, onboarding/offboarding | CC1, CC2 |
| **KnowBe4** | Security training completion | CC2 |

### Integration Approach
- **Read-only OAuth** — We pull data, we don't write. Reduces risk and permission concerns.
- **Evidence auto-collection** — Each integration auto-generates evidence artifacts tagged to controls.
- **Start manual, add integrations** — Every feature works with manual upload first. Integrations are acceleration, not requirements.

---

## 8. Pricing Strategy

### Guiding Principles
- **Published prices** — No "contact sales" for standard tiers. This alone differentiates us.
- **Monthly billing** — Lower commitment = faster adoption. Annual discount available.
- **No renewal surprises** — Same price next year. Period.
- **Audit fees are separate** — We're clear about this. We don't bundle or hide costs.

### Recommended Tiers

| Tier | Price | Target | What's Included |
|---|---|---|---|
| **Free** | $0 | Evaluation, developers | Audit logging (1 project, 1K events/mo), hash chaining, basic dashboard |
| **Starter** | $99/mo ($990/yr) | Solo founders, <10 employees | + Policy templates, control catalog, evidence vault (5GB), readiness dashboard, 3 projects, 50K events/mo |
| **Pro** | $299/mo ($2,990/yr) | Startups 10-50 employees | + Access reviews, vendor tracking, risk register, system description builder, 2 integrations, 10 projects, 500K events/mo |
| **Business** | $499/mo ($4,990/yr) | Growth 50-200 employees | + Auditor portal, incident tracker, personnel tracker, trust center, unlimited integrations, unlimited projects/events |
| **Enterprise** | Custom | 200+ employees | + Multi-entity, SSO/SAML, custom integrations, dedicated support, SLA |

### Revenue Math

AuditKit needs to be 80% cheaper than Vanta/Drata while capturing enough value:

| Scenario | Customers | Avg Revenue | ARR |
|---|---|---|---|
| Conservative (Year 1) | 100 customers | $200/mo avg | $240K |
| Target (Year 2) | 500 customers | $250/mo avg | $1.5M |
| Growth (Year 3) | 2,000 customers | $300/mo avg | $7.2M |

The $99-$499/mo range captures the underserved small/mid-market that can't afford $10K+/yr tools.

### Upsell Path
- Free → Starter: "You've been using audit logging. Now get SOC 2 ready."
- Starter → Pro: "You need access reviews and vendor tracking for your audit."
- Pro → Business: "Share evidence directly with your auditor."
- Additional frameworks (ISO 27001, HIPAA): +$49-$99/mo each (when available)

---

## 9. Implementation Plan

### P0 — "Audit Prep Platform" (4-6 weeks)

```
Week 1-2: Evidence Vault + Control Catalog
├── DB: evidence, evidence_tags, controls, control_frameworks tables
├── API: Evidence CRUD + upload, Control CRUD
├── UI: /dashboard/evidence (upload, tag, search, gap view)
├── UI: /dashboard/compliance overhaul (control list with readiness %)
├── Pre-seed: SOC 2 CC1-CC9 control catalog from JSON
├── Hash every upload (SHA-256, tie into existing hash chain)
└── Export: Zip package organized by control for auditor

Week 3-4: Policy Template Library
├── DB: policies, policy_versions, policy_acknowledgments tables
├── API: Policy CRUD, version, acknowledge endpoints
├── UI: /dashboard/policies (template picker, editor, acknowledgment tracking)
├── Templates: 15 pre-written SOC 2 policies (MDX in packages/shared)
├── Version tracking with diff view
└── PDF export for auditor submission

Week 5-6: Integration + Polish
├── Connect existing anomaly_alerts → control health indicators
├── Connect existing audit_events → evidence auto-collection
├── Readiness score calculation
├── Dashboard overview widgets
├── Pricing page update
└── Blog content: "Get SOC 2 ready with AuditKit"
```

### P1 — "Automate the Tedium" (6-8 weeks)

```
Week 1-3: Access Reviews + Vendor Tracking
├── DB: access_reviews, access_review_entries, vendors, vendor_documents
├── API: Campaign CRUD, vendor CRUD
├── UI: /dashboard/access-reviews, /dashboard/vendors
├── First integration: Google Workspace (read-only user list)
└── Evidence auto-saved to vault

Week 4-6: Risk Register + System Description Builder
├── DB: risks, risk_treatments
├── API: Risk CRUD
├── UI: /dashboard/risks (risk matrix view)
├── System description wizard in /dashboard/compliance
├── Connect anomaly_alerts → risk auto-flagging
└── PDF export for risk assessment + system description

Week 7-8: Polish + Onboarding
├── Guided onboarding flow ("What's your tech stack? What frameworks?")
├── Readiness assessment quiz
├── Email notifications (evidence expiring, reviews due, policies to acknowledge)
└── Getting-started documentation
```

### P2 — "Auditor-Friendly" (6-8 weeks)

```
Auditor Portal + Incident Tracker + Personnel + Trust Center
├── Read-only auditor user role
├── Incident tracking with severity + timeline
├── Personnel evidence tracker
├── Public trust center page
└── Additional integrations (GitHub, Okta, Azure AD)
```

---

## 10. Auditor Evidence Checklist

What auditors request and what AuditKit can automate:

### Policies & Documents

| Evidence | AuditKit Feature | Status |
|---|---|---|
| Information Security Policy | Policy Template Library | P0 |
| Acceptable Use Policy | Policy Template Library | P0 |
| Change Management Policy | Policy Template Library | P0 |
| Incident Response Plan | Policy Template Library | P0 |
| Business Continuity Plan | Policy Template Library | P0 |
| Data Classification Policy | Policy Template Library | P0 |
| Access Control Policy | Policy Template Library | P0 |
| Vendor Management Policy | Policy Template Library | P0 |
| Data Retention Policy | Policy Template Library | P0 |
| Risk Assessment Methodology | Policy Template Library | P0 |
| Privacy Policy | Policy Template Library | P0 |
| System Description | System Description Builder | P1 |

### Technical Evidence

| Evidence | AuditKit Feature | Status |
|---|---|---|
| Encryption at rest config | Already built (AES-256-GCM) | Done |
| Encryption in transit (TLS) | Already built | Done |
| Logging configuration | AuditKit IS the logging | Done |
| Anomaly detection alerts | Already built | Done |
| SIEM integration proof | Already built | Done |
| RBAC role definitions | Already built | Done |
| API key scope config | Already built | Done |
| Audit trail of all events | Already built (hash-chained) | Done |
| Hash chain verification | Already built (Merkle proofs) | Done |
| Event signing verification | Already built (Ed25519) | Done |
| MFA configuration | Identity provider integration | P2 |
| Vulnerability scan results | Manual upload to Evidence Vault | P0 |
| Penetration test report | Manual upload to Evidence Vault | P0 |
| Network diagrams | Manual upload to Evidence Vault | P0 |
| Backup configuration | Manual upload to Evidence Vault | P0 |

### Operational Evidence (Type II)

| Evidence | AuditKit Feature | Status |
|---|---|---|
| Access review records | Access Review Campaigns | P1 |
| Change management tickets | GitHub/Jira integration | P2 |
| Incident tickets and RCA | Incident Response Tracker | P2 |
| Training completion | Personnel Tracker | P2 |
| Background check records | Personnel Tracker | P2 |
| Vendor assessment records | Vendor Inventory | P1 |
| Risk assessment records | Risk Register | P1 |

---

## 11. Database Schema

### P0 Tables

```sql
-- Evidence Vault
CREATE TABLE evidence (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'screenshot', 'document', 'csv', 'link', 'auto_collected'
  file_url TEXT, -- S3 URL for uploads
  external_url TEXT, -- for links
  file_hash TEXT, -- SHA-256 hash of uploaded file
  chain_hash TEXT, -- hash chain link (ties into existing audit trail)
  collected_at TIMESTAMP DEFAULT NOW(),
  collected_by INTEGER REFERENCES users(id),
  auto_source TEXT, -- 'auditkit_events', 'github', 'okta', etc. (NULL for manual)
  audit_period_start DATE,
  audit_period_end DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE evidence_tags (
  id SERIAL PRIMARY KEY,
  evidence_id INTEGER REFERENCES evidence(id) ON DELETE CASCADE,
  control_id INTEGER REFERENCES controls(id),
  framework TEXT NOT NULL, -- 'soc2', 'iso27001', 'hipaa'
  criteria_id TEXT NOT NULL, -- 'CC6.1', 'CC7.2', 'A1.1'
  UNIQUE(evidence_id, control_id)
);

-- Control Catalog
CREATE TABLE controls (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  framework TEXT NOT NULL, -- 'soc2', 'iso27001', 'hipaa'
  criteria_id TEXT NOT NULL, -- 'CC6.1', 'CC7.2', etc.
  title TEXT NOT NULL,
  description TEXT,
  what_auditors_want TEXT, -- plain English guidance
  evidence_guidance TEXT, -- what to upload
  implementation_status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'ready', 'verified'
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE control_frameworks (
  id SERIAL PRIMARY KEY,
  framework TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'security', 'availability', 'processing_integrity', 'confidentiality', 'privacy'
  UNIQUE(framework, criteria_id)
);

-- Policy Management
CREATE TABLE policies (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL, -- 'security', 'access', 'change-mgmt', 'incident', 'vendor', 'hr', 'data', 'bcp'
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  current_version_id INTEGER,
  review_frequency TEXT DEFAULT 'annual',
  next_review_date TIMESTAMP,
  owner_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE policy_versions (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES policies(id),
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL, -- markdown
  change_summary TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE policy_acknowledgments (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES policies(id),
  policy_version_id INTEGER REFERENCES policy_versions(id),
  user_id INTEGER REFERENCES users(id),
  acknowledged_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  UNIQUE(policy_version_id, user_id)
);
```

### P1 Tables

```sql
-- Access Reviews
CREATE TABLE access_reviews (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'in_progress', 'completed'
  reviewer_id INTEGER REFERENCES users(id),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE access_review_entries (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES access_reviews(id),
  user_email TEXT NOT NULL,
  user_name TEXT,
  system TEXT NOT NULL, -- 'github', 'aws', 'okta', etc.
  role TEXT,
  last_active TIMESTAMP,
  decision TEXT, -- 'approve', 'revoke', 'pending'
  decision_by INTEGER REFERENCES users(id),
  decision_at TIMESTAMP,
  notes TEXT
);

-- Vendor Management
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  name TEXT NOT NULL,
  category TEXT, -- 'infrastructure', 'security', 'hr', 'finance', 'development'
  criticality TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  data_access_level TEXT, -- 'none', 'metadata', 'customer_data', 'sensitive_data'
  status TEXT DEFAULT 'active',
  last_assessed_at TIMESTAMP,
  next_review_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vendor_documents (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id),
  type TEXT NOT NULL, -- 'soc2_report', 'dpa', 'baa', 'contract', 'assessment'
  title TEXT NOT NULL,
  file_url TEXT,
  expires_at TIMESTAMP,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by INTEGER REFERENCES users(id)
);

-- Risk Register
CREATE TABLE risks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'security', 'operational', 'compliance', 'financial', 'reputational'
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  treatment TEXT DEFAULT 'mitigate', -- 'accept', 'mitigate', 'transfer', 'avoid'
  treatment_plan TEXT,
  owner_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'open', -- 'open', 'mitigated', 'accepted', 'closed'
  related_control_ids INTEGER[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### P2 Tables

```sql
-- Incidents
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'p0', 'p1', 'p2', 'p3', 'p4'
  status TEXT DEFAULT 'detected', -- 'detected', 'acknowledged', 'mitigating', 'resolved', 'rca_complete'
  description TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  mitigated_at TIMESTAMP,
  resolved_at TIMESTAMP,
  rca_completed_at TIMESTAMP,
  rca_summary TEXT,
  root_cause TEXT,
  impact_description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  anomaly_alert_id INTEGER, -- link to anomaly_alerts if auto-created
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Personnel
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  department TEXT,
  hire_date DATE,
  termination_date DATE,
  background_check_completed BOOLEAN DEFAULT FALSE,
  background_check_date DATE,
  training_completed BOOLEAN DEFAULT FALSE,
  training_date DATE,
  policy_acknowledged BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active', -- 'active', 'offboarding', 'terminated'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Summary: The Play

AuditKit already has the **hardest part built** — tamper-proof audit logging with cryptographic proof of integrity. No competitor has this.

What we add is the **evidence layer on top**: help customers collect, organize, and deliver evidence to auditors. Every feature generates evidence that flows into the Evidence Vault, tagged to controls, hash-verified, and exportable in the format auditors want.

**We don't compete with auditors.** We make their job easier. An auditor who gets a clean, organized, tamper-proof evidence package finishes faster — which saves the customer money on audit fees. That's the value loop.

**The market gap is real:** $7K-$50K/yr tools that are overkill for small companies. $0 tools (spreadsheets) that are insufficient. AuditKit fills the $1K-$5K/yr sweet spot with better evidence integrity than anything on the market.

**Ship P0 (Evidence Vault + Control Catalog + Policies) and we have a sellable SOC 2 prep platform.** Everything after that is acceleration.
