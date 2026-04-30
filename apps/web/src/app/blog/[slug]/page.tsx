import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, User, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { blogPosts, getPostBySlug, getAllSlugs } from '@/content/blog/posts';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: {
      canonical: `https://auditkit.dev/blog/${post.slug}`,
    },
    keywords: post.tags,
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: `https://auditkit.dev/blog/${post.slug}`,
      siteName: 'AuditKit',
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seoTitle,
      description: post.seoDescription,
    },
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const currentIndex = blogPosts.findIndex(p => p.slug === slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  const updatedAt = (post as { updatedAt?: string }).updatedAt || post.publishedAt;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: 'https://auditkit.dev/og-default.png',
    datePublished: post.publishedAt,
    dateModified: updatedAt,
    author: {
      '@type': 'Organization',
      name: post.author,
      url: 'https://auditkit.dev',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AuditKit',
      url: 'https://auditkit.dev',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://auditkit.dev/blog/${post.slug}`,
    },
    keywords: post.tags.join(', '),
    wordCount: post.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
  };

  const faqQuestions = extractQuestionsFromContent(post.content);
  const faqJsonLd = faqQuestions.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqQuestions,
      }
    : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://auditkit.dev' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://auditkit.dev/blog' },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link href="/blog" className="hover:text-foreground transition">
                Blog
              </Link>
            </li>
            <li>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li className="text-foreground truncate max-w-[200px]">{post.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </span>
            {updatedAt && updatedAt !== post.publishedAt && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                Updated <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
        </header>

        {/* Answer-lead / TL;DR — citable summary for AEO. LLMs preferentially
            cite tight definitional blocks at the top of an article. */}
        {post.description && (
          <aside
            aria-label="Summary"
            className="mb-10 rounded-xl border border-primary/30 bg-primary/5 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              TL;DR
            </p>
            <p className="text-base leading-relaxed text-foreground/90">
              {post.description}
            </p>
          </aside>
        )}

        {/* Content */}
        <div
          className="prose prose-invert prose-zinc max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-ul:text-muted-foreground prose-li:text-muted-foreground
            prose-li:marker:text-primary/50"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 border border-primary/20 rounded-xl p-8 bg-primary/5 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to ship audit logging?</h3>
          <p className="text-muted-foreground mb-4 max-w-lg mx-auto text-sm">
            AuditKit gives you tamper-evident audit trails and SOC 2 evidence collection in one platform. Start free.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h2 className="text-xl font-semibold mb-6">Related Articles</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group border border-border rounded-lg bg-card p-5 hover:border-primary/30 transition"
                >
                  <h3 className="font-medium mb-2 group-hover:text-primary transition">
                    {related.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {related.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-primary mt-3">
                    Read more <ChevronRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Prev / Next Navigation */}
        {(prevPost || nextPost) && (
          <nav className="mt-12 pt-8 border-t border-border flex items-stretch justify-between gap-4">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="group flex-1 flex items-start gap-3 border border-border rounded-lg p-4 hover:border-primary/30 transition"
              >
                <ArrowLeft className="h-4 w-4 mt-1 shrink-0 text-muted-foreground group-hover:text-primary transition" />
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground">Previous</span>
                  <p className="text-sm font-medium truncate group-hover:text-primary transition">{prevPost.title}</p>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextPost ? (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="group flex-1 flex items-start gap-3 border border-border rounded-lg p-4 hover:border-primary/30 transition text-right"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground">Next</span>
                  <p className="text-sm font-medium truncate group-hover:text-primary transition">{nextPost.title}</p>
                </div>
                <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground group-hover:text-primary transition" />
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </nav>
        )}
      </article>
    </>
  );
}

/**
 * Extract h2 questions and their following paragraph answers from HTML content
 * to generate FAQPage structured data for AEO.
 */
function extractQuestionsFromContent(html: string) {
  const questions: { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }[] = [];
  const sections = html.split(/<h2>/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const titleEnd = section.indexOf('</h2>');
    if (titleEnd === -1) continue;

    const title = section.substring(0, titleEnd).replace(/<[^>]*>/g, '').trim();
    if (!title.includes('?')) continue;

    const afterTitle = section.substring(titleEnd + 5);
    const paragraphs = afterTitle.match(/<p>([\s\S]*?)<\/p>/g);
    if (!paragraphs || paragraphs.length === 0) continue;

    const answer = paragraphs
      .slice(0, 2)
      .map((p) => p.replace(/<[^>]*>/g, '').trim())
      .join(' ');

    questions.push({
      '@type': 'Question',
      name: title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    });
  }

  return questions;
}
