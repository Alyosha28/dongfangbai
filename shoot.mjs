import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE = 'http://localhost:4321';
const SHOTS = path.join(__dirname, 'shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

const targets = [
  { path: '/?skipboot=1', name: '01-home', full: true },
  { path: '/about?skipboot=1', name: '02-about', full: false },
  { path: '/404?skipboot=1', name: '03-404', full: false },
  { path: '/posts/case-007?skipboot=1', name: '04-post-case-007', full: true },
  { path: '/posts/case-006?skipboot=1', name: '05-post-case-006', full: true },
  { path: '/posts/case-001?skipboot=1', name: '06-post-case-001', full: true },
];

const errors = [];
for (const t of targets) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${t.name}] ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${t.name}] ${m.text()}`); });
  console.log('->', t.name, t.path);
  await page.goto(BASE + t.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(SHOTS, t.name + '.png'), fullPage: t.full });
  await page.close();
}

// boot screen captures
const bootCaps = [
  { delay: 1300, name: '07-boot-logo' },
  { delay: 2400, name: '08-boot-magi' },
];
for (const c of bootCaps) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(c.delay);
  await page.screenshot({ path: path.join(SHOTS, c.name + '.png'), fullPage: false });
  await page.close();
}

await browser.close();
console.log('\nErrors:', errors.length === 0 ? 'none' : errors);
