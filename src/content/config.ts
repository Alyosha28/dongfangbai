import { defineCollection, z } from 'astro:content';

const DateLikeSchema = z.union([z.string(), z.date()]).transform((val) => {
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return val;
});

const thoughts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: DateLikeSchema,
    subtitle: z.string().nullish().transform((v) => v ?? ''),
    tags: z.array(z.string()).nullish().transform((v) => v ?? []),
    lang: z.enum(['zh', 'en']).nullish().transform((v) => v ?? 'zh'),
    draft: z.boolean().nullish().transform((v) => v ?? false),
    caseId: z.string().nullish().transform((v) => v || undefined),
    readTime: z.string().nullish().transform((v) => v || undefined),
    marginalia: z
      .array(
        z.object({
          label: z.string(),
          text: z.string(),
        })
      )
      .nullish()
      .transform((v) => v ?? []),
  }),
});

export const collections = { thoughts };
