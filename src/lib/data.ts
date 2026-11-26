import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro:content';
import type { Locale } from './i18n';

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
  siteTitleZh: optStr,
  siteUrl: z.string(),
  domain: z.string(),
  description: optStr,
  descriptionZh: optStr,
  tagline: optStr,
  taglineZh: optStr,
  bio: optStrArr,
  bioZh: optStrArr,
  interests: optStrArr,
  interestsZh: optStrArr,
  education: z
    .array(
      z.object({
        school: z.string(),
        schoolZh: optStr,
        degree: z.string(),
        degreeZh: optStr,
        period: z.string(),
        periodZh: optStr,
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  experience: z
    .array(
      z.object({
        period: z.string(),
        periodZh: optStr,
        role: z.string(),
        roleZh: optStr,
        org: z.string(),
        orgZh: optStr,
        summary: z.string(),
        summaryZh: optStr,
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  skills: z
    .array(
      z.object({
        group: z.string(),
        groupZh: optStr,
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
  statusZh: optStr,
  featured: z.boolean().nullish().transform((v) => v ?? true),
  tags: optStrArr,
  summary: z.string(),
  summaryZh: optStr,
  abstract: optStr,
  bibtex: optStr,
  links: z.array(LinkSchema).nullish().transform((v) => v ?? []),
});

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameZh: optStr,
  subtitle: optStr,
  subtitleZh: optStr,
  year: z.coerce.string(),
  yearZh: optStr,
  status: optStr,
  statusZh: optStr,
  featured: z.boolean().nullish().transform((v) => v ?? true),
  tags: optStrArr,
  summary: z.string(),
  summaryZh: optStr,
  highlights: optStrArr,
  highlightsZh: optStrArr,
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

export function getProfile(locale: Locale = 'en'): Profile {
  const raw = loadYamlFile('src/data/profile.yaml', ProfileSchema);
  if (locale !== 'zh') return raw;
  return {
    ...raw,
    siteTitle: raw.siteTitleZh || raw.siteTitle,
    description: raw.descriptionZh || raw.description,
    tagline: raw.taglineZh || raw.tagline,
    bio: raw.bioZh.length > 0 ? raw.bioZh : raw.bio,
    interests: raw.interestsZh.length > 0 ? raw.interestsZh : raw.interests,
    education: raw.education.map((edu) => ({
      ...edu,
      school: edu.schoolZh || edu.school,
      degree: edu.degreeZh || edu.degree,
      period: edu.periodZh || edu.period,
    })),
    experience: raw.experience.map((exp) => ({
      ...exp,
      period: exp.periodZh || exp.period,
      role: exp.roleZh || exp.role,
      org: exp.orgZh || exp.org,
      summary: exp.summaryZh || exp.summary,
    })),
    skills: raw.skills.map((skill) => ({
      ...skill,
      group: skill.groupZh || skill.group,
    })),
  };
}

export function getPapers(locale: Locale = 'en'): Paper[] {
  const items = loadYamlFile('src/data/papers.yaml', z.object({ items: z.array(PaperSchema) })).items;
  if (locale !== 'zh') return items;
  return items.map((paper) => ({
    ...paper,
    status: paper.statusZh || paper.status,
    summary: paper.summaryZh || paper.summary,
  }));
}

export function getProjects(locale: Locale = 'en'): Project[] {
  const items = loadYamlFile('src/data/projects.yaml', z.object({ items: z.array(ProjectSchema) })).items;
  if (locale !== 'zh') return items;
  return items.map((project) => ({
    ...project,
    name: project.nameZh || project.name,
    subtitle: project.subtitleZh || project.subtitle,
    year: project.yearZh || project.year,
    status: project.statusZh || project.status,
    summary: project.summaryZh || project.summary,
    highlights: project.highlightsZh.length > 0 ? project.highlightsZh : project.highlights,
  }));
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

export function estimateReadTime(body: string, explicit?: string, locale: Locale = 'en'): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const cjkCount = (body.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const latinText = body.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ').replace(/[`*_>#\-[\]()]/g, ' ');
  const wordCount = latinText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(cjkCount / 320 + wordCount / 220));
  return locale === 'zh' ? `约 ${minutes} 分钟` : `${minutes} min read`;
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
