# Show HN Draft

> Personal reference only. Do NOT commit to GitHub.

---

## Post

**Title:** Show HN: AuditKit – Open-source audit logs + SOC 2 prep (AGPLv3, replaces Drata/Vanta)

**URL:** https://github.com/auditkit/auditkit

---

## Maker Comment (post as first comment)

Hi HN -- I built AuditKit because I watched two startups in a row pay Drata or Vanta $7-25K/yr for a feature set where 80% of the value is "we have audit logs and a place to store evidence." That is not $25K/yr of value. AuditKit is an open-source, drop-in audit log + SOC 2 evidence platform with hash-chained tamper-evidence, multi-tenant scoping, and one-line SDKs in TypeScript, Python, Go, and Java. Self-hosted is free; cloud starts at $99/mo.

**Why I built it:** Every B2B SaaS hitting their first enterprise deal has the same panic moment -- a procurement team asks for SOC 2 Type II evidence and you realize your "audit logs" are unstructured Pino lines in CloudWatch. You can roll your own (4-8 weeks of engineering time you do not have) or you can hand $15K/yr to Drata. There has to be a third option.

**How it works:** `auditkit.log({ actor, action, resource, ... })` from your application. Events get SHA-256 hash-chained as they land, so any tampering shows up as a broken chain. Each event is tenant-scoped, so enterprise customers can pull their own audit trail (a SOC 2 plus and a sales differentiator). Auditors can pull evidence directly through a read-only portal -- no more spending the week before the audit cobbling together CSVs.

**On the licensing choice:** AGPLv3 instead of MIT. I went back and forth on this. AGPLv3 means if you fork AuditKit and run it as a service, you must open-source your modifications. For self-hosters and SaaS embedders the AGPL is fine because audit logs are infrastructure, not customer-facing UI. The reason to pick AGPLv3 over MIT is to prevent AWS / GCP / managed-service vendors from forking the project and selling AuditKit-as-a-service without contributing back. The Drata-killer story only works if the project stays alive long enough to mature.

**Technical choices worth discussing:**

- **Hash chaining over Merkle trees** -- a Merkle tree gives you O(log n) inclusion proofs but adds enormous operational complexity. SHA-256 hash chaining gives you O(1) tamper detection at write-time and O(n) verification at audit-time. For SOC 2, "we can prove the log is intact end-to-end" is the bar. Merkle is overkill until you are at billions of events per tenant per month.
- **Postgres over a specialty audit-log store** -- there are dedicated immutable-log databases (QLDB, Immudb). They are great products and a hard sell to a startup CTO who already has Postgres. AuditKit uses Postgres with append-only constraints and chain validation. The cost-of-ownership delta vs running a second stateful system is huge.
- **Drop-in SDK over a sidecar** -- some competitors (looking at you, Retraced) ship as a sidecar service you stand up alongside your app. SDK-only deployment works for 95% of use cases and removes operational surface. Sidecar mode is a roadmap item for orgs that need it.
- **Per-tenant queries on a single table** -- multi-tenant audit logs make this an interesting indexing problem. Composite (tenant_id, occurred_at desc) covers it, but the table has to be big enough that the index actually pays for itself. Partitioning by tenant_id is on the roadmap for the largest deployments.
- **Event schema is intentionally minimal** -- actor, action, resource, occurred_at, metadata (JSONB). Auditors care about who did what to what when. Resist the urge to add eight nullable optional fields; they will not be populated consistently and they will not be searched.

I would love feedback on: hash-chain validation under concurrent writes, the cost model for the cloud tier vs Drata/Vanta, and which compliance frameworks beyond SOC 2 to support next (ISO 27001, HIPAA, GDPR all on the roadmap).

- GitHub: https://github.com/auditkit/auditkit
- Live demo: https://auditkit.dev/demo
- Docs: https://auditkit.dev/docs
- SOC 2 cost analysis (write-up): https://auditkit.dev/blog/soc-2-compliance-cost-breakdown-2026

---

## Responses to Expected Questions

### "Why not just use CloudTrail / CloudWatch / Datadog audit logs?"

Three reasons. First, none of those are tenant-scoped -- you cannot show Customer A their audit trail without showing them Customer B's. That kills the most valuable enterprise-sales feature. Second, none provide auditor-friendly evidence export -- a SOC 2 auditor wants a clean tenant-scoped, time-bounded export with chain-of-custody, not a CloudWatch query. Third, they are application-event-blind -- they capture infrastructure events (API calls, IAM changes) but not business events ("user X invited user Y to org Z"). SOC 2 cares about both, with business events doing the heavy lifting on most controls.

### "How is this different from Retraced (now WorkOS Audit Logs)?"

Three big differences. (1) License -- AuditKit is AGPLv3. Retraced was Apache; WorkOS Audit Logs is closed-source SaaS. If you need to self-host with no vendor dependency, AuditKit is the only option in this category. (2) Cost -- self-hosted is free; the cloud tier starts at $99/mo. WorkOS Audit Logs starts at $0 but quickly hits four figures with usage. (3) Evidence portal -- AuditKit ships a read-only auditor portal out of the box, not as an enterprise add-on. The auditor portal is what saves the engineering team a week of CSV-export pain during the audit window.

### "How is this different from Drata, Vanta, Secureframe?"

AuditKit is not a full compliance platform -- it is the audit log + evidence slice. Drata/Vanta/Secureframe also do vendor risk, policy management, control monitoring, employee onboarding flows, and a dozen other things. If you need all of that, you still need a full platform. If you specifically need the audit log + SOC 2 evidence slice (which is what most early-stage SaaS actually needs and what these platforms charge $7-25K/yr for), AuditKit gets you 80% of the value at 0-5% of the cost.

### "Why AGPLv3 and not MIT or Apache?"

I genuinely went back and forth. The case for MIT is permissiveness and adoption velocity -- everyone can use it, including in commercial closed-source products. The case for AGPLv3 is that it prevents the project from being lifted by AWS/GCP/Cloudflare and rebadged as a managed service without contributing back. Audit logs are infrastructure that benefits enormously from collective improvement (chain algorithms, query patterns, evidence formats, framework compliance mappings). I want those improvements to flow back. AGPLv3 enforces that for service providers without affecting most legitimate uses (running it inside your own SaaS for your own audit logs is fine -- the AGPL only triggers when you offer AuditKit-as-a-service to third parties).

### "Can't I just write this myself in a weekend?"

You can write a basic version in a weekend. You probably will not write the hash-chain validation, the tenant scoping, the auditor portal, the evidence export pipeline, the multi-language SDKs with retry/batching, the chain-repair tooling for the inevitable corruption case, or the framework-specific compliance mappings (SOC 2 CC6.1 / CC7.2 / CC7.3 → fields → query patterns). I have written audit logs three times now at three companies; the third time always takes longer than the first because you start trying to do it correctly. AuditKit is the third version of three companies' worth of audit logs, packaged so you do not have to do it again.

### "What is the catch with the $99/mo cloud tier?"

50K events/mo. That fits most early-stage B2B SaaS. The limit doubles roughly each tier ($299 = 500K, $499 = 2M, $999 = 10M). At 10M+ events/mo enterprises typically self-host anyway. The cloud tier is sized for the "I do not want to operate Postgres + a worker for audit logs" customer, not for hyperscale.

### "What is on the roadmap?"

The big near-term ones: ISO 27001, HIPAA, and GDPR control mappings (the framework data layer is shared, the mappings are per-framework); SIEM connectors (Splunk HEC, Datadog, Elastic) for orgs that want audit logs to flow into their SIEM; and tenant-table partitioning for the deployments doing 100M+ events/mo per tenant. Longer-term: signed events (each event signed by the actor's key, not just chained), and a CLI for offline chain verification by auditors.

---

## Backup Hooks (if you need to repost or follow up in the thread)

- "We benchmarked AuditKit's chain validation at 12K events/sec on a single Postgres instance with no special tuning. Happy to share the test harness if anyone's interested."
- "If you have a strong opinion on whether SOC 2 control mappings should ship as YAML, JSON, or TS, I would love to hear it -- this is the next thing being designed."
- "For anyone running a SOC 2 Type II audit window right now: you can plug AuditKit in mid-window and it back-fills evidence forward. The auditor will only see clean events from plug-in time, but that is enough for most period observation as long as you plug in early."

---

## X / Twitter Thread (5 tweets)

**Tweet 1 (hook):**
Built AuditKit: open-source SOC 2 audit logs + evidence portal in one drop-in SDK.

Replaces the audit log slice of Drata/Vanta ($7-25K/yr) for $0 self-hosted or $99/mo cloud.

AGPLv3. Hash-chained. Tenant-scoped. Multi-language SDKs.

🔗 https://auditkit.dev

**Tweet 2 (problem):**
The pattern at every B2B SaaS hitting their first enterprise deal:

procurement asks for SOC 2 evidence →
your "audit logs" are unstructured Pino lines in CloudWatch →
you panic-pay Drata $15K/yr for a feature where 80% of the value is "we have a place to store evidence."

There has to be a third option.

**Tweet 3 (the technical angle):**
Why hash chaining over a Merkle tree?

O(1) tamper detection at write-time.
O(n) verification at audit-time.
Postgres-native (no specialty DB needed).
SOC 2 only requires "we can prove the log is intact end-to-end" -- Merkle is overkill until billions of events/tenant/mo.

**Tweet 4 (the wedge):**
Drop-in audit logging in 4 lines:

```ts
import { AuditKit } from '@auditkit/sdk'
const log = new AuditKit({ apiKey })
await log.event({
  actor: user.id,
  action: 'org.member.invite',
  resource: invite.id,
  tenantId: org.id
})
```

That's it. Tamper-evident, tenant-scoped, auditor-readable. SDKs in TS, Python, Go, Java.

**Tweet 5 (CTA):**
Open source: https://github.com/auditkit/auditkit
Cloud (free trial): https://auditkit.dev
Cost analysis vs Drata/Vanta: https://auditkit.dev/blog/soc-2-compliance-cost-breakdown-2026

If you're staring down a SOC 2 Type II window, this saves you 4-8 weeks. ⏱️

---

## r/devops Reddit Post (long-form, value-first; not a launch)

**Title:** SOC 2 audit logs: the build vs buy math after doing it three times

**Body:**

I have implemented audit logging at three different B2B SaaS companies for SOC 2 prep. Each time I told myself "the last one was the hard one, this time will be quick." Each time it was harder, not easier, because I started doing it correctly. Sharing what I learned in case anyone is staring down their first SOC 2 Type II.

**The work that gets underestimated:**

1. **Tenant scoping.** Customers want to see their own audit trail. That means every event needs `tenant_id` on it from day one and your queries need to be tenant-bounded by default. Adding tenant scoping later is a migration nightmare because every event ever logged was tenant-blind.

2. **Tamper evidence.** Auditors ask "how do you know nobody modified the log?" The answer cannot be "well, the database has constraints." It needs to be "every event hash-chains to the previous one and we run periodic chain validation." Hash chaining is 30 lines of code; the operational rigor around chain repair when something does break is much more.

3. **Evidence export.** The week before your SOC 2 observation period closes, your auditor asks for a tenant-scoped, time-bounded export of all CC6.1, CC7.2, and CC7.3 evidence in their preferred format. If you have not built the export pipeline before that day, you are building it that week instead of doing your actual job.

4. **Schema discipline.** The temptation to add `description`, `severity`, `category`, `tags`, `metadata`, `extra_metadata` is overwhelming. Auditors care about who did what to what when. Resist. A minimal schema (actor, action, resource, occurred_at, metadata JSONB) is more searchable than a wide one.

5. **Multi-language SDKs.** If you have TypeScript on the front end, Go on a service mesh, and Python in your data layer, you need three audit SDKs that produce structurally identical events. Otherwise your audit log is a federation of three slightly different schemas.

**The rough cost:** 4-8 engineering weeks the first time, 2-4 weeks the second time, 2-3 weeks the third time. The cost does not asymptote to zero; it asymptotes to "all the things you skipped the first two times that the auditor caught."

**What I would do today:** Drop in a service that has already done the hard parts (tenant scoping, hash chaining, evidence export, multi-language SDKs) and spend my engineering time on differentiated product work. There are a few options now -- Drata/Vanta have audit logs as a feature inside their $7-25K/yr platforms, WorkOS Audit Logs is a managed offering, and AuditKit is open source under AGPLv3 with a self-hosted free option and a $99/mo cloud tier. (Disclosure: I built AuditKit because I was tired of doing this work for the fourth time.)

The build-vs-buy math: 4-8 engineering weeks is roughly $30-80K of loaded engineering time. The cheapest tier of any decent buy option is under $2K/yr. Build only if you have specific reasons (regulatory data residency, deeply custom compliance needs, internal compliance is core to your product). Otherwise buy and ship product.

Curious what others have learned doing this -- especially the part nobody talks about, which is what to do when chain validation fails on an event that is now legally required for the audit window.

---

## Indie Hackers Post (community-tuned)

**Title:** Built an open-source SOC 2 audit log platform — went from $0 to first cloud signup in 8 days

**Body:**

I built AuditKit because I had implemented audit logs for SOC 2 compliance three different times at three different startups, each time wishing the last version was a library I could import. So I made the library.

**The product:** drop-in audit log SDK + SOC 2 evidence portal. Open source under AGPLv3. Self-hosted is free; cloud starts at $99/mo. Replaces the audit log slice of Drata/Vanta (which charge $7-25K/yr for a feature set where most of the value is "we have audit logs and a place to store evidence").

**Distribution so far:**
- 19 SEO blog posts targeting compliance keywords (SOC 2, ISO 27001, HIPAA, GDPR audit trails)
- Comparison pages vs WorkOS, Drata, Vanta, Pangea, Retraced
- llms.txt for AI search engine visibility (the next channel after Google)
- About to launch on HN

**What is working:**
- The "open-source vs $40K/yr Drata/Vanta" wedge is sharp and specific. Buyers immediately understand the value gap.
- AGPLv3 license has not been a problem for self-hosters. It would be a problem for service-provider forkers, which is the point.
- Auditor-portal feature is a meaningful enterprise-sales differentiator. Auditors love clean evidence exports.

**What is not working yet:**
- Search Console shows 15 impressions in the first 4 days of indexing. SEO compounds slow.
- The cloud free tier (50K events/mo on the $99 plan) is enough for early-stage SaaS but the $99 price point is a bigger ask than I expected for a product where the open-source option is free. Most signups are on the cloud trial; many will eventually self-host.
- Need a Show HN. Drafting now.

If you're an indie hacker who has either struggled through SOC 2 prep or is going to soon, would love your thoughts on what would make this an obvious "yes" for you. The biggest unknown right now is whether the wedge is sharp enough to convert engineers as buyers (vs going through a CTO/security lead).

GitHub: https://github.com/auditkit/auditkit
Site: https://auditkit.dev
SOC 2 cost write-up: https://auditkit.dev/blog/soc-2-compliance-cost-breakdown-2026
