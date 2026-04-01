import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, Tag } from 'lucide-react';
import { blogPosts } from '@/content/blog/posts';

export const metadata: Metadata = {
  title: 'Blog — AuditKit',
  description:
    'Insights on audit logging, SOC 2 compliance, tamper-proof logs, and building enterprise-ready B2B SaaS. From the AuditKit team.',
  alternates: {
    canonical: 'https://auditkit.dev/blog',
  },
  openGraph: {
    title: 'Blog — AuditKit',
    description:
      'Insights on audit logging, SOC 2 compliance, tamper-proof logs, and building enterprise-ready B2B SaaS.',
    url: 'https://auditkit.dev/blog',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — AuditKit',
    description:
      'Insights on audit logging, SOC 2 compliance, and building enterprise-ready B2B SaaS.',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogListingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'AuditKit Blog',
    description:
      'Insights on audit logging, SOC 2 compliance, tamper-proof logs, and building enterprise-ready B2B SaaS.',
    url: 'https://auditkit.dev/blog',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'AuditKit',
      url: 'https://auditkit.dev',
    },
    blogPost: blogPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      author: {
        '@type': 'Organization',
        name: post.author,
      },
      url: `https://auditkit.dev/blog/${post.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Insights on audit logging, compliance, and building enterprise-ready SaaS. Learn best
            practices from the AuditKit team.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group border border-border rounded-lg bg-card p-6 hover:border-primary/30 transition flex flex-col"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition">
                {post.title}
              </h2>

              <p className="text-sm text-muted-foreground mb-4 flex-1">{post.description}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
