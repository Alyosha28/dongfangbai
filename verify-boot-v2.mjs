import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://dongfangbai.shuqiu7628.workers.dev';
const SHOTS = path.join(__dirname, 'shots-boot-v2');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// Capture boot animation at 4 timestamps to see new 1.5s flow
const frames = [
  { delay: 200, name: '01-boot-0.2s-warning' },
  { delay: 600, name: '02-boot-0.6s-skip-visible' },
  { delay: 1000, name: '03-boot-1.0s-status-line' },
  { delay: 1300, name: '04-boot-1.3s-near-end' },
  { delay: 2000, name: '05-home-revealed' },
];

const errors = [];
for (const f of frames) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${f.name}] ${e.message}`));
  page.on('requestfailed', r => errors.push(`[${f.name}] FAILED: ${r.url()}`));
  console.log('->', f.name);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(f.delay);
  await page.screenshot({ path: path.join(SHOTS, f.name + '.png'), fullPage: false });
  await page.close();
}

// SFX preload check
const sfxPage = await ctx.newPage();
await sfxPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
const preloadLinks = await sfxPage.$$eval('link[rel="preload"][as="audio"]', (els) => els.map(e => e.getAttribute('href')));
console.log('\nSFX preload links found:', preloadLinks.length);
preloadLinks.forEach(l => console.log('  ' + l));
await sfxPage.close();

await browser.close();
console.log('\nErrors:', errors.length === 0 ? 'none' : errors);
