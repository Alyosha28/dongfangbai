import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getProfile, normalizeDate } from '../lib/data';

export async function GET(context: APIContext) {
  const profile = getProfile();
  const thoughts = (await getCollection('thoughts'))
    .filter((t) => !t.data.draft)
    .sort((a, b) => normalizeDate(b.data.date).localeCompare(normalizeDate(a.data.date)));

  return rss({
    title: profile.siteTitle,
    description: profile.description,
    site: context.site ?? profile.siteUrl,
    items: thoughts.map((entry) => ({
      title: entry.data.title,
      pubDate: new Date(`${normalizeDate(entry.data.date)}T00:00:00Z`),
      description: entry.data.subtitle || entry.data.title,
      link: `/thoughts/${entry.slug}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
