import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const rawTitle = process.argv.slice(2).join(' ').trim();
if (!rawTitle) {
  console.error('Usage: npm run new "Article Title"');
  process.exit(1);
}

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const isoDate = `${yyyy}-${mm}-${dd}`;

const asciiSlug = rawTitle
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .slice(0, 48);

const slug = asciiSlug || `note-${mm}${dd}`;
const thoughtsDir = join(process.cwd(), 'src', 'content', 'thoughts');
await mkdir(thoughtsDir, { recursive: true });

let fileName = `${isoDate}-${slug}.md`;
let targetPath = join(thoughtsDir, fileName);
let idx = 2;
while (existsSync(targetPath)) {
  fileName = `${isoDate}-${slug}-${idx}.md`;
  targetPath = join(thoughtsDir, fileName);
  idx += 1;
}

const hasCjk = /[\u4e00-\u9fff]/.test(rawTitle);
const lang = hasCjk ? 'zh' : 'en';
const escapedTitle = rawTitle.replace(/"/g, '\\"');

const template = `---
title: "${escapedTitle}"
date: "${isoDate}"
subtitle: ""
tags: []
lang: "${lang}"
draft: true
---

Write your thoughts here in pure Markdown.
`;

await writeFile(targetPath, template, 'utf8');
console.log(`Created ${targetPath}`);
