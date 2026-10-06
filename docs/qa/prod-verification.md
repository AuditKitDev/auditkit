# Production verification, 2026-10-06

Target: `https://api.auditkit.dev` (VPS container `auditkit`, commit 721a14b+). All steps run from grim-desktop as a customer would, with a throwaway account created through the public sign-in flow and a live API key minted in the dashboard API.

| # | Path | Evidence | Result |
|---|---|---|---|
| 1 | Sign-up via magic link → session → project → live key | `/auth/magic` 202, `/auth/callback` 302, project `p_0b76b945439a2b05`, key `k_2370dbe48743` | PASS |
| 2 | TypeScript SDK quickstart (`@auditkit/sdk`) | two events chained (`prev_hash` match), receipt verified offline against `/.well-known/auditkit.json` key, search with `invoice.*`, export 6 lines | PASS |
| 3 | Python SDK (`auditkit`) | receipt position 0, verify True, export 2 lines | PASS |
| 4 | Customer-side signing | registered key accepted (pos 0); wrong key → 400; `require_client_sig` → unsigned 400; signed accepted (pos 1) | PASS |
| 5 | Erasure | `erase` appended `payload.erased`; verify still VALID; export shows the erased event without payload | PASS |
| 6 | Offline verifier on a production export after an anchor tick | `VALID`, roots rebuilt, Rekor `log2025-1.rekor.sigstore.dev/140525461` verified offline, OTS pending (calendar), coverage anchored 0..4, exit 0 | PASS |
| 7 | Viewer token (auditor path) | token created, `/api/viewer/events` scoped to tenant, verify `anchored_through 4`, `/viewer` page 200 | PASS |
| 8 | Real Claude Code client over MCP | `claude mcp add --transport http … /mcp` → Connected; `list_tenants`, `verify_range`, `search_events` answered correctly | PASS |
| 9 | Gotchi Closet audit module (PR #11 branch) against production | `steward.run` event with tx hash arrived under the wallet tenant | PASS |
| 10 | GVR audit module (PR gvr#1 branch) against production | `x402.call` event with payer and price arrived | PASS |
| 11 | Platform self-audit | `/audit` 200; `/public/self/verify` valid; `platform.start` at position 0 | PASS |
| 12 | Repeatable: `pnpm --filter @auditkit/server smoke:prod` | see `scripts/smoke-prod.mjs` output in this session | PASS |

Known pending: OTS receipts reach `final` after Bitcoin confirmation (hours); `maintain()` upgrades them on the 60 s loop. Mail is in stub mode until `RESEND_API_KEY` is set.
