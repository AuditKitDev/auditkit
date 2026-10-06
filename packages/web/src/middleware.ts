// Dev-only: serve /app/projects/<any id>/... from the static /app/projects/_/... page.
// In production nginx does the same rewrite (see README.md). Static builds never run this at request time.
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((ctx, next) => {
  const m = ctx.url.pathname.match(/^\/app\/projects\/([^/]+)(\/[a-z-]+)?\/?$/);
  if (import.meta.env.DEV && m && m[1] !== "_") return ctx.rewrite(`/app/projects/_${m[2] ?? ""}`);
  return next();
});
