import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro:content';

const optStr = z.string().nullish().transform((v) => v ?? '');
const optStrArr = z.array(z.string()).nullish().transform((v) => v ?? []);

const LinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

const ProfileLinkSchema = z.object({
  label: z.string(),
  handle: z.string(),
  url: z.string(),
  external: z.boolean().nullish().transform((v) => v ?? true),
});

const ProfileSchema = z.object({
  name: z.string(),
  nativeName: optStr,
  moniker: optStr,
  epigraph: optStr,
  epigraphAttribution: optStr,
  siteTitle: z.string(),
  siteUrl: z.string(),
  domain: z.string(),
  description: optStr,
  tagline: optStr,
  bio: optStrArr,
  interests: optStrArr,
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string(),
        period: z.string(),
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  experience: z
    .array(
      z.object({
        period: z.string(),
        role: z.string(),
        org: z.string(),
        summary: z.string(),
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  skills: z
    .array(
      z.object({
        group: z.string(),
        items: optStrArr,
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  links: z.array(ProfileLinkSchema).nullish().transform((v) => v ?? []),
});

const PaperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  authorNote: optStr,
  venue: z.string(),
  year: z.coerce.number(),
  status: optStr,
  featured: z.boolean().nullish().transform((v) => v ?? true),
  tags: optStrArr,
  summary: z.string(),
  abstract: optStr,
  bibtex: optStr,
  links: z.array(LinkSchema).nullish().transform((v) => v ?? []),
});

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: optStr,
  year: z.coerce.string(),
  status: optStr,
  featured: z.boolean().nullish().transform((v) => v ?? true),
  tags: optStrArr,
  summary: z.string(),
  highlights: optStrArr,
  links: z.array(LinkSchema).nullish().transform((v) => v ?? []),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Paper = z.infer<typeof PaperSchema>;
export type Project = z.infer<typeof ProjectSchema>;

function loadYamlFile<S extends z.ZodTypeAny>(relPath: string, schema: S): z.infer<S> {
  const fullPath = join(process.cwd(), relPath);
  const raw = readFileSync(fullPath, 'utf8');
  return schema.parse(parse(raw));
}

export function getProfile(): Profile {
  return loadYamlFile('src/data/profile.yaml', ProfileSchema);
}

export function getPapers(): Paper[] {
  return loadYamlFile('src/data/papers.yaml', z.object({ items: z.array(PaperSchema) })).items;
}

export function getProjects(): Project[] {
  return loadYamlFile('src/data/projects.yaml', z.object({ items: z.array(ProjectSchema) })).items;
}

export function normalizeDate(dateInput: string | Date): string {
  const trimmed =
    dateInput instanceof Date ? dateInput.toISOString().slice(0, 10) : dateInput.trim();
  const parts = trimmed.replace(/\./g, '-').split('-');
  if (parts.length === 3) {
    return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return trimmed;
}

export function estimateReadTime(body: string, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const cjkCount = (body.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const latinText = body.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ').replace(/[`*_>#\-[\]()]/g, ' ');
  const wordCount = latinText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(cjkCount / 320 + wordCount / 220));
  return `${minutes} min read`;
}

export interface AuthorToken {
  name: string;
  isOwner: boolean;
}

export function tokenizeAuthors(authors: string[], ownerName: string): AuthorToken[] {
  const normalizedOwner = ownerName.trim().toLowerCase();
  return authors.map((name) => ({
    name,
    isOwner: name.trim().toLowerCase() === normalizedOwner,
  }));
}
