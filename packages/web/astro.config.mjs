// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

const API = process.env.API_ORIGIN ?? "http://localhost:3001";
// Prefixes the server owns (docs/web-api.md); nginx proxies the same list. No Astro page may use one of them.
const apiPaths = ["/v1", "/auth", "/oauth", "/api", "/demo", "/public", "/webhooks", "/mcp", "/openapi.json", "/health", "/.well-known"];
const proxy = Object.fromEntries(apiPaths.map((p) => [p, { target: API, changeOrigin: false }]));

export default defineConfig({
  output: "static",
  site: "https://auditkit.dev",
  trailingSlash: "never",
  build: { format: "directory", inlineStylesheets: "auto" },
  integrations: [preact(), sitemap({ filter: (page) => !/\/(app|login|viewer|404)(\/|$)/.test(page) })],
  vite: {
    plugins: [tailwindcss()],
    server: { proxy },
    preview: { proxy },
  },
});
