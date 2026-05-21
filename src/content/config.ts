// Optional · extended schema · supports `marginalia` frontmatter on posts
// Replace src/content/config.ts with this if you want marginalia in markdown
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    caseId: z.string(),                  // e.g. "CASE-008"
    date: z.string(),                    // "YYYY.MM.DD"
    tags: z.array(z.string()),
    readTime: z.string(),                // "5 MIN"
    title: z.string(),
    subtitle: z.string(),
    draft: z.boolean().optional().default(false),

    // NEW · optional marginalia notes shown in the right gutter
    // In frontmatter:
    //   marginalia:
    //     - label: "ON 数字花园"
    //       text: "概念由 <span class='em'>Maggie Appleton</span> 推广 (2020)..."
    //     - label: "「歌未竟」"
    //       text: "毛 1964 年作..."
    marginalia: z
      .array(
        z.object({
          label: z.string(),
          text: z.string(), // raw HTML allowed; rendered via set:html
        })
      )
      .optional(),
  }),
});

export const collections = { posts };
