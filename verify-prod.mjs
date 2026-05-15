import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://dongfangbai.shuqiu7628.workers.dev';
const SHOTS = path.join(__dirname, 'shots-prod');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
});

const targets = [
  { path: '/?skipboot=1', name: '01-home', full: true },
  { path: '/about?skipboot=1', name: '02-about', full: false },
  { path: '/posts/case-007?skipboot=1', name: '03-post-007', full: true },
  { path: '/posts/case-001?skipboot=1', name: '04-post-001', full: true },
  { path: '/this-page-does-not-exist?skipboot=1', name: '05-404', full: false },
];

const issues = { errors: [], warnings: [], failedRequests: [] };

for (const t of targets) {
  const page = await ctx.newPage();
  page.on('pageerror', e => issues.errors.push(`[${t.name}] PageError: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error') issues.errors.push(`[${t.name}] Console: ${m.text()}`);
    else if (m.type() === 'warning') issues.warnings.push(`[${t.name}] Warn: ${m.text()}`);
  });
  page.on('requestfailed', req => {
    issues.failedRequests.push(`[${t.name}] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  const resp = await page.goto(BASE + t.path, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => null);
  const status = resp?.status();
  console.log(`-> ${t.name} ${t.path} → HTTP ${status}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, t.name + '.png'), fullPage: t.full });
  await page.close();
}

// also test SFX resource loads
const sfxPage = await ctx.newPage();
const sfxChecks = ['/sfx/boot-init.mp3', '/sfx/boot-complete.mp3', '/sfx/theme-toggle.mp3'];
const sfxResults = [];
for (const s of sfxChecks) {
  const resp = await sfxPage.goto(BASE + s, { timeout: 15000 }).catch(e => ({ status: () => 'ERR', headers: () => ({}) }));
  sfxResults.push(`${s}: HTTP ${resp.status()} · ${resp.headers?.()['content-type'] || 'no content-type'}`);
}
await sfxPage.close();

await browser.close();

console.log('\n=== SFX resource checks ===');
sfxResults.forEach(r => console.log('  ' + r));
console.log('\n=== Issues ===');
console.log('  page errors:    ', issues.errors.length);
console.log('  warnings:       ', issues.warnings.length);
console.log('  failed requests:', issues.failedRequests.length);
if (issues.errors.length) issues.errors.forEach(e => console.log('  !! ' + e));
if (issues.failedRequests.length) issues.failedRequests.forEach(e => console.log('  !! ' + e));
