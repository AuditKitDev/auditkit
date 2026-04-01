import { blogPosts } from '@/content/blog/posts';

export async function GET() {
  const baseUrl = 'https://auditkit.dev';

  const items = blogPosts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author>hello@auditkit.dev (${post.author})</author>
    </item>`)
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AuditKit Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Audit logging, SOC 2 compliance, and security best practices for B2B SaaS teams.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
