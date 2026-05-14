import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    caseId: z.string(),
    date: z.string(),
    tags: z.array(z.string()),
    readTime: z.string(),
    title: z.string(),
    subtitle: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
