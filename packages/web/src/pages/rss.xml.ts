import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { SITE_URL } from "../lib/site";

const posts = import.meta.glob<{ frontmatter: { title: string; description: string; date: string } }>("./blog/*.md", { eager: true });

export const GET: APIRoute = () =>
  rss({
    title: "AuditKit blog",
    description: "Design notes on tamper-evident audit logs: hash chains, Merkle roots, public anchoring, crypto-shredding.",
    site: SITE_URL,
    items: Object.entries(posts).map(([path, m]) => ({
      title: m.frontmatter.title,
      description: m.frontmatter.description,
      pubDate: new Date(m.frontmatter.date),
      link: `/blog/${path.replace("./blog/", "").replace(/\.md$/, "")}`,
    })).sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
  });
