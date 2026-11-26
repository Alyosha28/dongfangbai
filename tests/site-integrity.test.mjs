import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;

const FORBIDDEN_PII_PATTERNS = [
  /xianzhuo/i,
  /\bhuang\b/i,
  /黄显卓/,
  /151[\s-]*5865/,
  /5865[\s-]*3637/,
  /23\/100/,
  /CET-6/i,
  /\b538\b/,
  /CMT\s+Group/i,
  /人民奖学金/,
];

async function collectFiles(dir, extensions) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

test('built site contains all expected routes and sprite assets', async () => {
  const expectedFiles = [
    'dist/index.html',
    'dist/papers/index.html',
    'dist/projects/index.html',
    'dist/thoughts/index.html',
    'dist/thoughts/case-001/index.html',
    'dist/thoughts/case-002/index.html',
    'dist/posts/case-001/index.html',
    'dist/posts/case-002/index.html',
    'dist/about/index.html',
    'dist/zh/index.html',
    'dist/zh/papers/index.html',
    'dist/zh/projects/index.html',
    'dist/zh/thoughts/index.html',
    'dist/zh/thoughts/case-001/index.html',
    'dist/zh/thoughts/case-002/index.html',
    'dist/zh/about/index.html',
    'dist/404.html',
    'dist/papers/continual-execution-feedback.pdf',
    'dist/papers/evo-harness.pdf',
    'dist/pet/mouse-spritesheet.png',
    'dist/pet/mouse-spritesheet.webp',
  ];

  for (const rel of expectedFiles) {
    assert.equal(existsSync(join(ROOT, rel)), true, `Missing built artifact: ${rel}`);
  }
  assert.equal(existsSync(join(ROOT, 'dist/rss.xml')), false, 'RSS feed should not be generated');
});

test('each rendered page has exactly one <main>, color-scheme meta, and render-blocking expect link', async () => {
  const pageHtmlFiles = [
    'dist/index.html',
    'dist/papers/index.html',
    'dist/projects/index.html',
    'dist/thoughts/index.html',
    'dist/thoughts/case-001/index.html',
    'dist/thoughts/case-002/index.html',
    'dist/about/index.html',
    'dist/zh/index.html',
    'dist/zh/papers/index.html',
    'dist/zh/projects/index.html',
    'dist/zh/thoughts/index.html',
    'dist/zh/thoughts/case-001/index.html',
    'dist/zh/thoughts/case-002/index.html',
    'dist/zh/about/index.html',
    'dist/404.html',
  ];

  for (const rel of pageHtmlFiles) {
    const html = await readFile(join(ROOT, rel), 'utf8');
    const mainMatches = html.match(/<main\b/g) ?? [];
    assert.equal(mainMatches.length, 1, `${rel} should have exactly 1 <main>, found ${mainMatches.length}`);
    assert.match(
      html,
      /<meta name="color-scheme" content="light dark"\s*\/?>/,
      `${rel} must declare <meta name="color-scheme" content="light dark">`
    );
    assert.match(
      html,
      /<link rel="expect" href="#main-content" blocking="render"\s*\/?>/,
      `${rel} must declare <link rel="expect" href="#main-content" blocking="render">`
    );
    assert.doesNotMatch(
      html,
      /❚❚|▸|⌘/,
      `${rel} should use authored SVG icons instead of raw Unicode control glyphs`
    );
  }
});

test('quick index command palette, editorial ink editions, hero seal, and signoff actions render properly', async () => {
  const homeHtml = await readFile(join(ROOT, 'dist/index.html'), 'utf8');

  // Native <dialog closedby="any"> command palette with declarative invoker and no redundant ARIA dialog overrides
  assert.match(homeHtml, /id="cmdTrigger"[^>]*commandfor="commandPalette"/);
  assert.match(homeHtml, /id="cmdTrigger"[^>]*command="show-modal"/);
  const dialogTag = homeHtml.match(/<dialog[^>]*id="commandPalette"[^>]*>/)?.[0] ?? '';
  assert.ok(dialogTag, 'Missing #commandPalette <dialog>');
  assert.match(dialogTag, /closedby="any"/);
  assert.match(dialogTag, /aria-labelledby="cmdDialogTitle"/);
  assert.doesNotMatch(dialogTag, /role="dialog"|aria-modal/);

  // Command palette includes real YAML/Markdown entries & accessible ink state
  assert.match(homeHtml, /data-cmd-action="toggle-theme"/);
  assert.match(homeHtml, /data-cmd-action="set-ink:cinnabar"[^>]*aria-pressed="false"/);
  assert.match(homeHtml, /data-cmd-action="set-ink:plum"[^>]*aria-pressed="true"/);
  assert.match(homeHtml, /data-cmd-action="copy-email"/);
  assert.match(homeHtml, /id="cmdSearchInput"[^>]*autofocus/);

  // Editorial 4-ink swatch switcher in footer + early restore in head
  assert.match(homeHtml, /localStorage\.getItem\('site-ink'\)/);
  assert.match(homeHtml, /data-ink-switcher/);
  for (const ink of ['plum', 'cinnabar', 'celadon', 'noir']) {
    assert.match(homeHtml, new RegExp(`data-ink-option="${ink}"`));
  }

  // Interactive hero seal button & scoped lookbook interactive vs calm static /about ledger
  assert.match(homeHtml, /<button[^>]*id="heroSealBtn"[^>]*aria-label="Press archival seal"/);
  assert.match(homeHtml, /class="ledger-list ledger-list--interactive"/);
  const aboutHtmlCheck = await readFile(join(ROOT, 'dist/about/index.html'), 'utf8');
  assert.doesNotMatch(aboutHtmlCheck, /ledger-list--interactive/);

  // Article signoff copy-link and true back-to-top anchor
  const thoughtDetailHtml = await readFile(join(ROOT, 'dist/thoughts/case-001/index.html'), 'utf8');
  assert.match(thoughtDetailHtml, /<body[^>]*id="top"/);
  assert.match(thoughtDetailHtml, /data-copy-url/);
  assert.match(thoughtDetailHtml, /class="signoff-top-link"[^>]*href="#top"/);
});

test('deep-link anchors, expand-all control, TOC scrollspy nav, and epigraph colophon render properly', async () => {
  const homeHtml = await readFile(join(ROOT, 'dist/index.html'), 'utf8');
  assert.match(homeHtml, /歌未竟，东方白/);
  assert.match(homeHtml, /<span class="site-brand-name">Alba<\/span>/);
  assert.match(homeHtml, /<span class="site-brand-cn" lang="zh-CN">黍秋<\/span>/);
  const brandHtml = homeHtml.match(/<a class="site-brand"[\s\S]*?<\/a>/)?.[0] ?? '';
  assert.doesNotMatch(brandHtml, /东方白/);
  const heroNativeHtml = homeHtml.match(/<p class="intro-native"[\s\S]*?<\/p>/)?.[0] ?? '';
  assert.match(heroNativeHtml, /黍秋/);
  assert.doesNotMatch(heroNativeHtml, /东方白/);
  assert.match(homeHtml, /href="\/papers#continual-execution-feedback"/);
  assert.match(homeHtml, /href="\/projects#unwilling-or-unable"/);

  const papersHtml = await readFile(join(ROOT, 'dist/papers/index.html'), 'utf8');
  assert.match(papersHtml, /id="continual-execution-feedback"/);
  assert.match(papersHtml, /id="evo-harness"/);
  assert.match(papersHtml, /href="\/papers\/continual-execution-feedback\.pdf"/);
  assert.match(papersHtml, /href="\/papers\/evo-harness\.pdf"/);
  assert.match(papersHtml, /commandfor="papers-list"/);
  assert.match(papersHtml, /command="--toggle-all"/);

  const projectsHtml = await readFile(join(ROOT, 'dist/projects/index.html'), 'utf8');
  assert.match(projectsHtml, /id="unwilling-or-unable"/);
  assert.match(projectsHtml, /id="ashare-multifactor-system"/);

  const thoughtsHtml = await readFile(join(ROOT, 'dist/thoughts/index.html'), 'utf8');
  assert.match(thoughtsHtml, /CASE-001/);
  // With fewer than 6 thoughts, avoid rendering a premature topic filter bar
  assert.doesNotMatch(thoughtsHtml, /data-thought-filter/);
  // Ensure the Thoughts template preserves accessible focusgroup toolbar & external live status for 6+ thoughts
  const thoughtsTemplate = await readFile(join(ROOT, 'src/views/ThoughtsIndexView.astro'), 'utf8');
  assert.match(thoughtsTemplate, /thoughts\.length\s*>=\s*6/);
  assert.match(thoughtsTemplate, /data-thought-filter/);
  assert.match(thoughtsTemplate, /focusgroup:\s*'toolbar wrap'/);
  const toolbarTemplateSection = thoughtsTemplate.match(/<div[\s\S]*?role="toolbar"[\s\S]*?<\/div>/)?.[0] ?? '';
  assert.doesNotMatch(toolbarTemplateSection, /id="thoughtFilterStatus"/);
  assert.match(thoughtsTemplate, /id="thoughtFilterStatus"[^>]*role="status"/);

  // Paper items omit redundant solo-owner self-attribution and duplicate "Working Paper" venue
  assert.doesNotMatch(papersHtml, /First Author/);
  assert.doesNotMatch(homeHtml, /First Author/);
  assert.doesNotMatch(homeHtml, /Symbolic Regression/);
  assert.doesNotMatch(homeHtml, /Macro Event Study/);

  const thoughtDetailHtml = await readFile(join(ROOT, 'dist/thoughts/case-001/index.html'), 'utf8');
  assert.match(thoughtDetailHtml, /<nav class="article-toc" id="articleToc"/);
  assert.match(thoughtDetailHtml, /data-view="thought"/);
  assert.match(thoughtDetailHtml, /CASE-001/);

  // case-002 has no H2/H3 headings, so it must NOT emit an empty TOC <nav> landmark
  const thoughtCase002Html = await readFile(join(ROOT, 'dist/thoughts/case-002/index.html'), 'utf8');
  assert.doesNotMatch(thoughtCase002Html, /<nav class="article-toc"/);
  assert.match(thoughtCase002Html, /class="article-rail-spacer"/);
  assert.match(thoughtCase002Html, /class="pager-spacer"/);

  // 404 page must NOT hardcode "/404/" as the missing path
  const notFoundHtml = await readFile(join(ROOT, 'dist/404.html'), 'utf8');
  assert.doesNotMatch(notFoundHtml, /<code>\/404\/?<\/code>/);
  assert.match(notFoundHtml, /id="notFoundPath"/);

  // PixelPet live announcer must be mounted (never hidden) separate from visual bubble
  assert.match(homeHtml, /id="pixelPetAnnounce"[^>]*role="status"/);
  assert.match(homeHtml, /id="pixelPetNote"[^>]*aria-hidden="true"/);

  const aboutHtml = await readFile(join(ROOT, 'dist/about/index.html'), 'utf8');
  assert.match(aboutHtml, /<dl class="channel-list">/);
  assert.match(aboutHtml, /data-copy-text="shuqiu7628@gmail\.com"/);

  // Bilingual zh/en switcher, hreflang alternates, and /zh/ routes render properly
  assert.match(homeHtml, /id="langToggle"[^>]*href="\/zh"/);
  assert.match(homeHtml, /hreflang="zh-CN"[^>]*href="https:\/\/finalwhite\.lol\/zh"/);
  const zhHomeHtml = await readFile(join(ROOT, 'dist/zh/index.html'), 'utf8');
  assert.match(zhHomeHtml, /<html lang="zh-CN">/);
  assert.match(zhHomeHtml, /id="langToggle"[^>]*href="\/"/);
  assert.match(zhHomeHtml, /href="\/zh\/papers#continual-execution-feedback"/);
  const zhPapersHtml = await readFile(join(ROOT, 'dist/zh/papers/index.html'), 'utf8');
  assert.match(zhPapersHtml, /id="langToggle"[^>]*href="\/papers"/);
  assert.match(zhPapersHtml, /href="\/papers\/evo-harness\.pdf"/);
});

test('no sensitive CV personal details appear in src/ or dist/', async () => {
  const files = [
    ...(await collectFiles(join(ROOT, 'src'), ['.yaml', '.yml', '.md', '.astro', '.ts', '.css'])),
    ...(await collectFiles(join(ROOT, 'dist'), ['.html', '.xml', '.js', '.css'])),
  ];

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    for (const pattern of FORBIDDEN_PII_PATTERNS) {
      assert.doesNotMatch(content, pattern, `Sensitive CV string (${pattern}) found in ${filePath}`);
    }
  }
});
