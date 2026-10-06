# @auditkit/web

Astro static site: marketing, docs, legal, transparency page, and the dashboard (Preact islands). Output is `dist/`, served by nginx next to the API.

## Run

```sh
pnpm --filter @auditkit/web mock    # in-memory API on :3001 (scripts/mock-api.mjs); prints magic links to the console
pnpm --filter @auditkit/web dev     # Astro on :4321, proxies API paths to :3001
```

Against the real server instead of the mock:

```sh
pnpm --filter @auditkit/server dev  # :3001
pnpm --filter @auditkit/web dev
```

`API_ORIGIN=http://host:port` overrides the proxy target. The mock takes `MOCK_BILLING=1` (checkout returns a Stripe-looking URL instead of 501) and `MOCK_ANCHOR_MS` (anchor tick, default 20 s).

Checks: `pnpm --filter @auditkit/web build`, `typecheck` (astro check), `preview` (serves `dist/` with the same proxy).

## Routing contract (nginx)

nginx proxies `^/(v1|auth|oauth|api|demo|public|webhooks|mcp|openapi.json|health|.well-known/)` to the server; everything else is `dist/`. No Astro page uses one of those prefixes. Dashboard JSON is at `/api/app/*`, viewer JSON at `/api/viewer/*`; the HTML pages stay at `/app/*` and `/viewer`.

Project pages are built once at `/app/projects/_/…` and read the real id from the URL, so nginx needs two rewrites:

```nginx
location / {
  rewrite ^/app/projects/[^/]+/?$             /app/projects/_/index.html     break;
  rewrite ^/app/projects/[^/]+/([a-z-]+)/?$   /app/projects/_/$1/index.html  break;
  try_files $uri $uri/index.html =404;
}
```

In dev `src/middleware.ts` performs the same rewrite.

## Layout

- `src/pages` one file per route; `app/projects/[id]/*` build once at `/app/projects/_/…` and read the id from the URL (`src/middleware.ts` rewrites in dev).
- `src/islands` Preact (client-only on app pages; the homepage demo is the only island on marketing pages).
- `src/lib/api.ts` typed client for the contract; `src/lib/plans.ts` mirrors spec §6; `src/lib/site.ts` owner-decided constants.
- `src/pages/docs.astro` renders the API reference at build time from `packages/server/src/openapi.ts`.
- `src/pages/blog/*.md` posts with `BlogPost.astro` layout; `rss.xml.ts`, `llms.txt.ts`, sitemap via integration.
- Claims on the site → proof: `docs/claims.md`. Owner decisions: `OWNER-TODO.md`.
