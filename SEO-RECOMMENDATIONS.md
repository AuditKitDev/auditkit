# AuditKit.dev — SEO & Growth Recommendations

**Date:** 2026-03-26
**GSC Period:** Last 3 months (only 4 days of data: Mar 21-24 2026)
**Status:** Just indexed. Strong SEO foundations. Needs content scale.
**Distribution Engine:** llms.txt present, AI crawlers OK, MCP enabled (@auditkit/sdk + Python/Go/Java SDKs), 4 competitors tracked, 9 actions (5 done)

> **IMPORTANT: Implementation Guidelines**
> All recommendations below MUST be implemented in a way that:
> 1. **Does NOT negatively affect existing SEO** — no removing indexed pages, no changing URLs without redirects, no altering the dynamic sitemap generation or existing metadata API
> 2. **Does NOT negatively affect GEO (Generative Engine Optimization)** — llms.txt, AI crawler access, and structured data must be preserved or enhanced, never degraded
> 3. **Does NOT negatively affect AEO (Answer Engine Optimization)** — the auto-FAQ schema extraction from H2 headings is a key differentiator and MUST be preserved. New blog posts should follow the same pattern (H2s with "?" trigger FAQ schema)
> 4. **Does NOT break existing functionality** — Next.js App Router, SSG blog generation (`generateStaticParams`), Turborepo build, Fly.io deployment, Stripe billing, PostHog/GA4 analytics, and middleware authentication must all continue working. Test with `pnpm --filter @auditkit/web build` before deploying.
>
> When in doubt, make changes incrementally and verify in GSC/Lighthouse before proceeding to the next change.

---

## GSC Snapshot

| Metric | Value |
|--------|-------|
| Total Impressions | 15 |
| Total Clicks | 0 |
| Days with Data | 4 (Mar 21-24) |
| Top Query | "auditkit" (1 impression), "sdk audit" (1 impression) |
| Pages Indexed | Homepage only |
| Avg Position | ~9 |
| Devices | 93% desktop, 7% mobile |
| Top Country | US (8), Germany (2), UK (1) |

**Context:** 15 impressions in 4 days is a fast start for a freshly indexed site. Position ~9 means you're already on page 1 for some queries. The foundation is solid — now it needs content.

---

## Tech Stack Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| Framework | Next.js 15.2.0 (App Router) | Excellent for SEO |
| Rendering | SSR + SSG hybrid | Blog posts statically generated |
| Monorepo | pnpm + Turborepo | Clean architecture |
| Hosting | Fly.io + Vercel | Dual deployment options |
| Sitemap | Dynamic generation | Homepage, /blog, /docs, 3 blog posts |
| Schema Markup | Comprehensive | Organization, SoftwareApplication, Blog, Article, FAQ (auto-extracted) |
| robots.txt | Dynamic, AI crawlers allowed | GPTBot, ClaudeBot, PerplexityBot all allowed |
| Blog Posts | 3 total | Strong quality, low volume |
| Comparison Pages | 3 | WorkOS, Retraced, Pangea |
| Analytics | GA4 + PostHog | Well-instrumented |
| llms.txt | Present | AI crawler optimization for GEO/AEO |
| Canonical URLs | Implemented | Per-page with proper domain |
| Open Graph | Complete | Article type on blog posts |
| AEO Features | FAQ schema auto-extraction | H2 questions → FAQ schema automatically |

---

## What's Working Well

AuditKit has the **strongest SEO infrastructure** of all 5 properties:
- Dynamic sitemap that auto-includes new blog posts
- FAQ schema automatically extracted from blog H2 headings containing "?"
- Separate `seoTitle` and `seoDescription` fields per blog post (allows SERP optimization independent of display)
- llms.txt for AI search engine visibility
- Proper SSG for blog posts with `generateStaticParams()`
- Dual analytics (GA4 + PostHog) with conversion tracking

The architecture is ready. The bottleneck is content volume.

---

## Priority 1: Content Scale

### 1. Publish 10-15 More Blog Posts (URGENT)
3 blog posts isn't enough for topical authority. B2B SaaS audit logging is a niche — you can dominate it with 15-20 posts.

**High-priority topics:**
1. "SOC 2 Audit Log Requirements: Complete Checklist"
2. "ISO 27001 Logging Requirements for SaaS"
3. "HIPAA Audit Trail Requirements: What Your SaaS Needs"
4. "GDPR Audit Logging: Right of Access & Data Trail Compliance"
5. "How to Implement Tamper-Evident Audit Logs (SHA-256 Hash Chaining)"
6. "Multi-Tenant Audit Logging: Architecture Patterns"
7. "Audit Logs vs Application Logs: What's the Difference?"
8. "SIEM Integration Guide: Splunk, Datadog & Elastic"
9. "Building Audit Logs In-House vs Using a Service"
10. "Enterprise Audit Trail Best Practices (2026)"
11. "What Investors Look for in Your SaaS Security Posture"
12. "Audit Log Retention Policies: How Long Should You Keep Data?"
13. "Real-Time Audit Log Monitoring with GraphQL Subscriptions"
14. "AuditKit vs WorkOS Audit Logs: Detailed Comparison" (expand existing)
15. "Why Open Source Audit Logging Matters for Enterprise Trust"

### 2. Create Content Hubs / Pillar Pages
Organize content into topic clusters:

**Compliance Hub** (`/compliance` or `/guides/compliance`)
- SOC 2 requirements
- ISO 27001 requirements
- HIPAA audit trail
- GDPR data trails
- Links to all compliance blog posts

**Architecture Hub** (`/guides/architecture`)
- Hash chaining deep dive
- Multi-tenant patterns
- SIEM integration
- API security
- Links to all technical blog posts

### 3. Expand Comparison Pages
Current: WorkOS, Retraced, Pangea
Add:
- "AuditKit vs Building In-House"
- "AuditKit vs Custom PostgreSQL Triggers"
- "AuditKit vs Timber.io"
- "AuditKit vs audit-log npm packages"
- Generic: "Best Audit Log Solutions for SaaS (2026)"

---

## Priority 2: Technical Improvements

### 4. Add Breadcrumb Schema (JSON-LD)
Breadcrumbs are visual but not in structured data. Add BreadcrumbList JSON-LD to:
- Blog posts: Home > Blog > [Post Title]
- Docs: Home > Docs > [Section]
- Comparisons: Home > Compare > [Competitor]

### 5. Complete GA4 Page View Tracking
Currently only conversion events are tracked (signup, login, plan_upgraded). Add:
- Automatic page view tracking on route changes
- Blog scroll depth events
- CTA click tracking
- Outbound link tracking (GitHub, external docs)

### 6. Add Footer Navigation
No comprehensive footer detected. Add a footer with:
- Product links (Features, Pricing, Docs, Blog)
- Comparison links (vs WorkOS, vs Retraced, vs Pangea)
- Legal links (Privacy, Terms)
- Social/GitHub links
- This improves internal link equity distribution and crawlability

### 7. Featured Snippet Optimization
Your auto-FAQ extraction from H2s is clever. Double down:
- Start blog posts with a TL;DR definition box
- Use "What is X?" format for H2s (triggers FAQ schema + featured snippets)
- Add comparison tables (trigger table featured snippets)
- Add numbered step lists (trigger list featured snippets)

---

## Priority 3: Keyword Strategy

### Target Keywords by Intent

**Informational (Blog):**
- "what are audit logs" (definition)
- "audit log best practices" (guide)
- "soc 2 audit log requirements" (compliance)
- "tamper proof logging" (technical)
- "multi tenant audit trail" (architecture)

**Commercial Investigation (Comparison):**
- "best audit log service" (listicle)
- "workos audit logs alternative" (comparison)
- "audit logging saas" (category)
- "enterprise audit trail software" (buyer intent)

**Transactional (Product Pages):**
- "audit log api" (API docs, developer intent)
- "audit log sdk" (SDK reference)
- "open source audit logging" (positioning)

---

## Priority 4: Distribution & Authority

### 8. Developer Community Presence
- Post technical blog content to Dev.to, Hashnode, HackerNews
- Create a "awesome-audit-logging" GitHub repo linking back
- Answer audit logging questions on StackOverflow
- Engage in SaaS/security subreddits

### 9. Backlink Strategy
- Get listed on SaaS directories (G2, Product Hunt, AlternativeTo)
- Guest post on security/compliance blogs
- Create linkable assets (audit log checklist PDF, compliance matrix)
- Open source positioning naturally attracts GitHub stars → backlinks

---

## Monitoring Checklist

- [ ] Publish 5 new blog posts within 2 weeks
- [ ] Add breadcrumb schema to all content pages
- [ ] Add footer navigation component
- [ ] Verify all pages appear in GSC Coverage report
- [ ] Track emerging queries in GSC weekly
- [ ] Monitor position changes on "auditkit" brand query
- [ ] Run Lighthouse audit on production monthly
- [ ] Check Core Web Vitals in GSC Experience report

---

## Summary

AuditKit has the best SEO infrastructure of all 5 properties — dynamic sitemap, auto-FAQ schema extraction, SSG blog, dual analytics, llms.txt for AI search. The architecture is production-ready for scale.

**The only bottleneck is content volume.** 3 blog posts can't build topical authority in the B2B audit logging space. Publish 10-15 more posts targeting compliance keywords (SOC 2, ISO 27001, HIPAA) and expand comparison pages. The technical foundation will do the rest.

You're already on page 1 (position ~9) after just 4 days. This site has the potential to dominate its niche quickly.
