import type { MetadataRoute } from 'next';
import { getAllSlugs } from '@/content/blog/posts';
import { getAllFrameworkSlugs as getAllComplianceSlugs } from '@/lib/data/compliance-frameworks';
import { getAllDevFrameworkSlugs as getAllGuideFrameworkSlugs } from '@/lib/data/frameworks';
import { getAllIndustrySlugs } from '@/lib/data/industries';
import { getAllCompetitorSlugs } from '@/lib/data/competitors';
import { getAllMatrixSlugs } from '@/lib/data/framework-industry-matrix';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://auditkit.dev';
  const now = new Date();

  const blogSlugs = getAllSlugs();
  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Compliance framework pages
  const complianceEntries: MetadataRoute.Sitemap = getAllComplianceSlugs().map((slug) => ({
    url: `${baseUrl}/compliance/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Integration guide pages
  const guideEntries: MetadataRoute.Sitemap = getAllGuideFrameworkSlugs().map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Industry pages
  const industryEntries: MetadataRoute.Sitemap = getAllIndustrySlugs().map((slug) => ({
    url: `${baseUrl}/industries/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Framework × Industry matrix pSEO pages
  const matrixEntries: MetadataRoute.Sitemap = getAllMatrixSlugs().map((slug) => ({
    url: `${baseUrl}/audit-for/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Dynamic competitor pages (new ones only — existing static pages already listed)
  const existingCompare = ['vanta', 'drata', 'spreadsheets', 'workos', 'pangea', 'retraced'];
  const newCompareEntries: MetadataRoute.Sitemap = getAllCompetitorSlugs()
    .filter((slug) => !existingCompare.includes(slug))
    .map((slug) => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/soc-2`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Existing compare pages
    { url: `${baseUrl}/compare/vanta`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/drata`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/spreadsheets`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/workos`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/compare/pangea`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/compare/retraced`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // Index pages
    { url: `${baseUrl}/compliance`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/industries`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/tools/compliance-comparison`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    // Dynamic pages
    ...complianceEntries,
    ...guideEntries,
    ...industryEntries,
    ...matrixEntries,
    ...newCompareEntries,
    ...blogEntries,
  ];
}
