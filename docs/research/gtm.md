# AuditKit: go-to-market for the first 10 paying customers and 100 free signups

Written 2026-10-06. Builds on `buyer-need.md`, `market-bull.md`, `market-bear.md`; repeats nothing from them. Claim format: `source | claim | "quote" | fetched_at`. All fetches 2026-10-06 13:10–13:30Z. UNVERIFIED = not fetched; keep off the site. The Claude Connectors Directory is excluded by brief.

## 0. Where we stand (checked locally 13:24Z)

- `registry.npmjs.org/@auditkit%2Fsdk` and `/@auditkit%2Fverify`: `{"error":"Not found"}`. Every quickstart says `npx @auditkit/verify`; nothing is installable.
- PyPI `auditkit` is **taken**: Lexsi Labs v1.1.2, uploaded 2026-10-01, "Evaluate any model on any dataset and any task". `packages/sdk-python/pyproject.toml` still says `name = "auditkit"`. `auditkit-sdk` is free. Rename.
- npm `auditkit` is taken (website-audit CLI). The `@auditkit` scope has no packages; org ownership needs an npm login (owner).
- GitHub repo: 3 stars, licence `NOASSERTION`, slogan topics. Set `audit-log tamper-evident soc2 compliance mcp-server sigstore`.

## 1. The finding

1. **Broadcast launches of hash-chain audit logs draw nothing.** https://hn.algolia.com/api/v1/search?query=audit%20log&tags=show_hn | Every audit-log Show HN since 2020 sits at 1–7 points. | "unTamper – cryptographically verifiable audit logs: 2 pts" / "Auditledge – Hosted Audit Log API for SaaS: 2" / "Tamper-evident audit logging service to prevent DB rewrites: 2" / Retraced: "7" | 13:28Z. What fronted was positioned against a brand: "BoxyHQ – open-source alternative to Auth0/WorkOS: 176" (2022), "Stack, an open-source Clerk/Firebase Auth alternative: 144" (2024) | 13:24Z. Sigilbase, AuditLog.AI: no HN posts exist (13:24Z).
2. **The people who decide this purchase are published by name, free** (§4.4): Johanson Group lists ten vCISO/MSP partners, Insight Assurance eight, Drata's auditor directory every firm by tier. The bear's "15 people" list is already compiled.
3. **Compliance platforms cannot host our value; their customers can** (§4.4): Vanta's marketplace takes only built-in resource types; Secureframe's custom integrations take custom tests.
4. **Warm beat cold for the one comparable with a published history.** https://review.firstround.com/vantas-path-to-product-market-fit/ | "two or three emails a week, all through word of mouth" / "roughly two new customers per week" by month six / "Around 20 startups were already paying Vanta" before its own audit | 13:22Z

So: the 10 paying customers come through auditors, vCISO shops and warm outbound to companies that just announced SOC 2, sold as the bear's anchoring-only SKU ("keep your table; we sign, anchor, verify"). HN, registries and plugins produce the 100 free signups.

## 2. Ranked channel table

| # | Channel | Effort (h) | Cost | Expected, basis | First result | Prerequisites | Risk |
|---|---|---|---|---|---|---|---|
| 1 | Auditor/vCISO lists: Johanson 10, Insight Assurance 8, Drata directory, A-LIGN form | 20 + 3/wk | $0 | 3–5 design partners → 2–4 paid; basis: Vanta's warm-intro ramp | 2–3 wks | Anchor SKU; evidence-pack sample; npm published | Schellman "does not receive or pay any referral fees"; independence limits endorsement |
| 2 | Outbound to fresh SOC 2 announcers (GlobeNewswire: 3 real in 30 days), Conveyor example trust centers, Drata gallery | 15 + 4/wk | $0–47/mo + $7 mailbox | 1–3 paid; no verified reply-rate benchmark exists | 2–4 wks | CAN-SPAM footer; corporate addresses; hand-built list | $53,088 per violating email; LinkedIn ToS bans scraping |
| 3 | Show HN, verifier-first, URL `/audit` | 10 | $0 | 0–3 signups at the 2-point baseline; 30–80 if it fronts (PostHog: "well over 200 sign ups" from 282 pts) | Day 1 | npm publish; downloadable export | Current draft breaks the no-false-claims rule (§3) |
| 4 | Supabase Integration Partner (free, 1-wk review) + Better Auth plugin (no gatekeeper) + Kinde 1–30-day retention gap | 25 | $0 | 20–40 free; basis UNVERIFIED | 2–3 wks | Example repo | Listing without a launch moment is a dead page |
| 5 | Official MCP Registry (free, no review) + awesome-remote-mcp-servers PR + Smithery; skip mcp.so/mcpmarket pay-to-list | 6 | $0 | 10–30 free; no registry publishes install attribution | 1 wk | DNS TXT at apex; OAuth accepting Client-ID-Metadata clients | PulseMCP closed; Cursor/Cline need OSS repo |
| 6 | Secureframe custom-test and Vanta private-integration recipes | 30 | $0 | 0 direct; closes #1/#2 | 3–4 wks | Export API docs | Vanta "Custom Tests may require a plan upgrade or add-on" |
| 7 | Free listings: publicapis.dev, apis.guru, Postman public workspace, awesome-compliance, Console.dev email | 4 | $0 | 5–15 free | 2–6 wks | Public OpenAPI (exists) | Changelog News rejects "Commercial products/services" |
| 8 | Product Hunt (free, no hunter, 12:01am PT) | 6 | $0 | PostHog 448 / Clerk 261 upvotes in 2021; unknown now | Day 1 | Video, screenshots | Audience is not the buyer |
| 9 | LinkedIn document posts | 2/wk | $0 | Reach; documents 6.6% vs text 2.0% engagement (secondary source) | 4–8 wks | Two carousels | Link penalty 18.8–60% (sources disagree) |

## 3. The Show HN draft: verdict

Do not post `~/Projects/auditkit/SHOW-HN-DRAFT.md`. Rewrite.

- It sells the deleted product: "$99/mo cloud" with "$299/$499/$999" tiers (spec §6: $49/$199); Go and Java SDKs; "replaces Drata/Vanta" (spec §3 sends that buyer to Vanta); "Merkle is overkill" argues against the one non-commodity feature v2 has; an "auditor portal" that no longer exists.
- It breaks the no-false-claims rule: "I have written audit logs three times now at three companies"; "benchmarked … at 12K events/sec"; Indie Hackers "first cloud signup in 8 days", "19 SEO blog posts"; "Retraced (now WorkOS Audit Logs)" is wrong (retracedhq is independent, 451 stars).
- It breaks the HN rules. https://news.ycombinator.com/showhn.html | "Show HN is for something you've made that other people can play with." / off topic: "blog posts, sign-up pages, newsletters, lists" / "ideally without barriers such as signups or emails" / "Please don't ask friends to upvote or comment." | 13:25Z. https://news.ycombinator.com/yli.html | "Launch HN is a way for YC startups to launch on Hacker News." | 13:27Z.
- Expect the immudb objection. https://hn.algolia.com/api/v1/items/27275691 | "There, I did it for you in PostgreSQL: ALTER TABLE table_name SET (autovacuum_enabled = false); Snark aside, it's still not 100% clear what's the upside" | 13:25Z. The answer is the tamper demo, not a feature list.
- Rewrite: title "Show HN: AuditKit – audit logs you can verify with our servers off (Rekor + OpenTimestamps)", URL `/audit` with a downloadable export and `npx @auditkit/verify export.jsonl`. First comment: edit a row, run the verifier, show the failing position; the EDPB erasure pattern; the AGPL paragraph (keep); "one person, no SOC 2, here is why you don't have to trust me". Drop the X thread, r/devops essay and Indie Hackers post. Order matters: https://newsletter.posthog.com/p/how-we-got-our-first-1000-users | "We posted on Hacker News, and it went well, mainly because we'd achieved the other steps first." | 13:27Z

## 4. Evidence by area

### 4.1 Launch channels
- https://www.producthunt.com/launch | "It's 100% free to use." / "you cannot ask people directly to upvote your product" | 13:26Z
- https://posthog.com/blog/after-the-hn-launch | "well over 200 sign ups" / "over 800" stars in a week / "We spent $1K on marketing the repo" | 13:27Z. DISAGREE: later newsletter says "~$2,000 promoting the repo on Twitter".
- https://changelog.com/news/submit | "Submitting your own work is also encouraged." but "Commercial products/services. Sponsorship is your path." | 13:26Z. https://changelog.com/sponsor/pricing | "$1,500 per week (no minimums)" / "22,000+ subscribers" | 13:27Z (DISAGREE: /sponsor says "26,809").
- https://console.dev/selection-criteria | "Email hello@console.dev" | 13:27Z. Bytes, JS Weekly: email only, no price.
- https://lobste.rs/about | "self-promo should be less than a quarter of one's stories and comments" | 13:27Z. Reddit: all eight subs 403. Indie Hackers 404.

### 4.2 Developer distribution
- https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/CONTRIBUTING.md | "If your server is remote-only ... it belongs in awesome-remote-mcp-servers" / "add `🤖🤖🤖` to the end of the PR title ... fast-tracked." | 13:26Z
- awesome-selfhosted CONTRIBUTING.md | "first released more than 4 months ago" / "AI AGENTS: Do not create, submit, or modify GitHub Issues or Pull Requests" | 13:26Z. Owner submits, in February.
- https://raw.githubusercontent.com/Homebrew/brew/HEAD/docs/Package-Acceptance-Policy.md | "at least 90 forks, 90 watchers or 225 stars for a self-submission" / "can generally be maintained in a third-party tap" | 13:26Z. Tap only.
- https://raw.githubusercontent.com/marcelscruz/public-apis/main/CONTRIBUTING.md | "Paid, freemium and free APIs are all equally welcome" / "Self-serve — no waitlists" / "Custom domain required" | 13:26Z. apis.guru: "use the web form" (13:26Z). Postman: set workspace Public (13:27Z).
- GitHub topics (13:25Z): `tamper-evident` "384 public repositories", `soc2` "556". A few hundred stars is page 1. Trending algorithm undisclosed (ossinsight.io, 13:26Z).

### 4.3 MCP and agent registries
- https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/modelcontextprotocol-io/quickstart.mdx | "Your `server.json` must include a `remotes` entry and can omit `packages`" / "limits the `description` field to 100 characters" | 13:26Z. .../authentication.mdx | "`com.example.*/*`, where `com.example` is the reverse-DNS form of your domain" / "The TXT record must be placed on the **apex** of your domain" / or "`/.well-known/mcp-registry-auth`" | 13:27Z. .../moderation-policy.mdx | "We only remove illegal content, malware, spam, and completely broken servers." | 13:26Z. Name: `dev.auditkit/auditkit`.
- https://www.pulsemcp.com/submit | "We are not accepting new MCP server or client submissions right now" | 13:15Z
- https://smithery.ai/docs/build/publish | "Enter your server's public HTTPS URL" / "Smithery handles client registration automatically via Client ID Metadata Documents." | 13:17Z. Our AS must accept URL client IDs or the scan fails.
- https://developers.openai.com/plugins/plugin-guidelines.md | must not collect "session IDs, trace IDs, request IDs, timestamps, or logging metadata" / "Selling digital products or services—including subscriptions ... is not allowed." | 13:20Z. Skip.
- Baseline: https://glama.ai/mcp/servers/AiAgentKarl/agent-audit-trail-mcp | "hash-chained event logs" / "No current deployment available through Glama" | 13:24Z. No remote OAuth audit-log server is listed anywhere fetched.

### 4.4 Compliance ecosystem
- https://developer.vanta.com/docs/guides/become-partner | "free to join" / "Email integrationpartners@vanta.com" / "Push your first resource (most partners start with `UserAccount`) on an hourly schedule" / "one to two weeks" | 13:26Z. https://developer.vanta.com/docs/concepts/integrations | "Public marketplace integrations cannot push custom resources or author Custom Tests on a customer's behalf." | 13:26Z. https://developer.vanta.com/docs/build-integrations | "Custom Tests may require a plan upgrade or add-on" | 13:26Z
- https://secureframe.com/features/api | "Define custom schemas and write custom automated tests for the resources from your custom integrations" | 13:26Z. DISAGREE with Vanta.
- https://drata.com/partners/technology | "Directory listing" / "revenue sharing on referred opportunities" | 13:26Z. https://docs.sprinto.com/settings/billing/sprinto-referral-program | "$500 gift card when your referral signs a contract" | 13:26Z. https://www.schellman.com/strategic-partnerships | "Schellman does not receive or pay any referral fees" | 13:26Z. Plan on $0 from auditors.
- https://www.johansonllp.com/partners | "Airius, Arancia, BD Emerson, Bright Defense, GRC Concierge, Kobalt, Practical Assurance, Tagore, Trava Security, VioletX" | 13:26Z. https://insightassurance.com/partners/ | "Cognisys, Workstreet, Rhymetec, Eden Data, Agency, Steel Patriot Partners, DigitalXRAID, Axlora" / "We're always looking to expand our network" | 13:26Z. https://www.a-lign.com/partners | "reach out within 24 hours" / "prohibits them from performing the work" | 13:26Z. https://drata.com/partners/audit-alliance/directory | Elite "Sensiba, A-LIGN, MJD Advisors, Insight Assurance"; Advanced "BARR, Baker Tilly, Schellman, Prescient, Coalfire" | 13:26Z
- https://www.vanta.com/products/questionnaire-automation | Answer banks are customer-owned. | "Imports questions from ... DOCX, and PDFs" | 13:26Z. Ship a DOCX the customer uploads.
- UNVERIFIED: Prescient, Audit Peak (404), Sensiba, vCISO communities, Upwork (403).

### 4.5 Outbound and law
- https://www.globenewswire.com/search/keyword/SOC%202%20Type%20II | "Coveron completes SOC 2 Type II certification with zero exceptions — October 05, 2026" / "pMD® ... October 02, 2026" / "PrivacyHawk ... September 25, 2026" | 13:12Z
- https://www.conveyor.com/platform/trust-center | `/trust-center-examples`; "Zendesk, Betterment, Temporal, Sprout Social, Alteryx, dbt Labs, Carta, Zapier, Lucid Software, Sumo Logic" | 13:26Z. safebase.io/customers → drata.com/customers, "8,500+ Global Customers", filterable (13:16Z).
- https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business | "Identify the message as an ad." / "Tell recipients where you're located." / "Honor opt-out requests promptly." / "penalties of up to $53,088" / "The law makes no exception for business-to-business email." | 13:12Z
- ICO PECR guide | "You can email or text any corporate body" / "Sole traders and some partnerships are treated as individuals" | 13:12Z. CASL (laws-lois.justice.gc.ca) | implied consent if the address is "conspicuously published ... and the message is relevant to the person's business, role" / "$10,000,000" | 13:22Z
- https://support.google.com/a/answer/81126 | "Keep spam rates ... below 0.3%" / "Set up SPF or DKIM" | 13:12Z. Tooling (13:12Z): Instantly "$47/mo"; Smartlead "$39/month"; lemlist "$69/month"; Hunter Free "50 credits/month"; Clay Free "500 actions/month"; Workspace "$7.00". Apollo UNVERIFIED.
- https://www.dataslayer.ai/blog/linkedin-algorithm-february-2026-whats-working-now | documents "6.60% average engagement", text "2.00%", links "~60% less reach" | 13:22Z (secondary; leadmagic snippet says 18.8%, UNVERIFIED). LinkedIn ToS bans scraping and automation (user-agreement, 13:12Z).

### 4.6 Partnerships
- https://supabase.com/partners | "Review — This takes a week. It's faster if the integration is already live." / "Launch — We help with the listing, the integration, and the launch moment." / "Solution Partner: You build on Supabase on behalf of clients." | batch 1. https://supabase.com/docs/guides/auth/audit-logs | "Stored in the `auth.audit_log_entries` table" / "Query capabilities are limited to the dashboard interface" | batch 4
- https://clerk.com/changelog/2026-08-25-admin-logs | dashboard-only "Admin Logs ... available on the Business and Enterprise plans" | batch 3. https://www.better-auth.com/docs/concepts/plugins | "The only required property is `id`" | batch 3. Kinde partner program UNVERIFIED.

### 4.7 Pricing and packaging
- WorkOS "Event retention (per 1M events) $99/mo" (batch 1). immudb Vault "paid plans start at $69 per month" (2023; pricing page 404). Azure Confidential Ledger "Ledger: $-/hour per instance" (batch 1): DISAGREE with the $3/day in `market-bull.md`; do not quote it. Woleet 404, guardtime.com DNS failure: the pure-anchoring category is empty, so no price anchor and no incumbent.

### 4.8 Content
- https://navattic.com/report/state-of-the-interactive-product-demo-2026 | "66% of top demos are ungated" / "80% of top performing demo CTAs are visible above the fold" | batch 3 (vendor data, no signup number). vanta.com/resources/free-tools and conveyor.com/free-tools: 404. No public "paste one questionnaire item" tool exists; the gap is ours.

## 5. First 30 days

**Week 1: installable and honest.** Owner: publish `@auditkit/sdk`, `@auditkit/verify`; rename and publish `auditkit-sdk`; claim the `@auditkit` org; generate and pin the Ed25519 key (OWNER-TODO 13–14); fix topics and licence. Board: the Anchor SKU as code (`auditkit anchor --table audit_events` or JSONL from S3: hash, root, Rekor+OTS, status on `/anchors`, evidence pack mapping PCI 10.3.2, AU-9(3), CCM LOG-09); a per-plan DOCX of questionnaire answers (CAIQ LOG-02/LOG-09, HECVAT audit-log item) for upload into Vanta/Conveyor; `/audit` gets "download this export, verify it yourself" and a 90-second recording.

**Week 2: the 30 named people.** From a Workspace mailbox, by hand, under 50/day: Johanson's 10 vCISO firms, Insight Assurance's 8, security heads at Coveron, pMD, PrivacyHawk, and five Conveyor example-trust-center companies. One question (the bear's: how often did log integrity have to be proven to an outsider last year?) plus the E1 offer. Corporate addresses only; postal address and opt-out in the footer. Submit the A-LIGN form; apply to Drata Launch and Secureframe technology partner; email integrationpartners@vanta.com to confirm a `UserAccount` listing is pointless (in writing). Apply to Supabase before the example is finished.

**Week 3: free-signup channels.** Show HN as in §3, Tue–Thu morning US, nothing else that day, every comment answered within the hour. Publish `@auditkit/better-auth` and the Supabase example; open the Supabase listing. Publish `dev.auditkit/auditkit` to the official MCP registry (DNS TXT at the apex), submit to Smithery, PR awesome-remote-mcp-servers and awesome-compliance, add the Cursor deeplink to /docs, list on publicapis.dev and apis.guru, email Console.dev. Two LinkedIn document posts: "What your auditor can and cannot verify about your audit log" and "Erasure without breaking the chain (EDPB 02/2025)". Link in the first comment, not the body.

**Week 4: convert and measure.** Secureframe custom-test and Vanta private-integration recipes as docs pages, sent to every week-2 respondent. Call every free signup with more than 100 events; offer Anchor or Pro at E1 terms. Tally replies, calls, partners, paid, free signups, verifier runs (npm downloads, `/anchors` fetches). Decide week 5 by §6.

## 6. Three experiments to run first

**E1. Auditor/vCISO design partners (channel #1).** Business free for 6 months, then $199, for a logo, a case study and one 30-minute call with their auditor; cap five. Success by day 30: ≥5 replies and ≥3 accepted from 30 emails, and the bear's bar, ≥3 of 15 citing a real log-integrity incident with a deal or dollar attached. Below that, hosted custody is not the business; Anchor is.

**E2. Anchor vs Pro (pricing).** Two rows live at once: "Anchor" $29/mo per project, flat (our cost is per tick, not per event; contrast WorkOS's per-million), your table and our proof; "Pro" $49 hosted. Success: which row takes the first three paid conversions. Anchor 3:0 means cut hosted Free to a demo and lead with Anchor.

**E3. Verifier-first Show HN (channel #3).** Success: ≥50 points or ≥20 comments on the day, which unlocks Product Hunt and paid newsletters; ≤7 points (the category baseline) means no more broadcast spend; hours go to #1 and #2. Secondary: `@auditkit/verify` downloads over 7 days; free signups with ≥1 event.

## 7. Owner-only prerequisites

1. npm org `@auditkit`; publish `@auditkit/sdk`, `@auditkit/verify`; PyPI publish as `auditkit-sdk` (`auditkit` is Lexsi Labs').
2. Production Ed25519 key, pinned (OWNER-TODO 13); until then the site keeps saying `--pin`.
3. Stripe prices for Pro, Business and Anchor.
4. Sending identity: legal name and postal address for the CAN-SPAM footer; Workspace mailbox on auditkit.dev with SPF/DKIM/DMARC.
5. Sign-off on E1 terms and the Anchor price.
6. HN and Product Hunt posts from the owner's accounts (board drafts).
7. DNS TXT at the apex of auditkit.dev for the MCP registry.
8. OWNER-TODO items that block outbound credibility: data location, sub-processor, refund policy, support commitment.

## 8. Disagreements to keep visible

- Vanta forbids partner-authored custom tests publicly; Secureframe allows them customer-side.
- Referral money: Schellman none; Sprinto $500; Drata/Thoropass unspecified. Plan on $0.
- Azure Confidential Ledger "$-" on the official page vs $3/day in `market-bull.md` (title-only fetch).

## 9. UNVERIFIED (not fetched; do not cite)

Reddit rules (403); Indie Hackers; TLDR/Bytes/JS Weekly prices; Medium; RapidAPI; GitHub Trending mechanics; `@auditkit` org ownership; Smithery pricing; Glama scoring; Cursor publish page; ChatGPT Enterprise connectors; Make review time; Prescient, Audit Peak, Sensiba, vCISO communities, Upwork; Kinde partners; Better Stack, Highlight, Clutch; Pangea and immudb current prices; Gumroad kits; Woleet; Apollo; YC directory; cold-email reply benchmarks; van der Blom report; Resend signup figures; Storylane; SecurityPal, Wolfia.
