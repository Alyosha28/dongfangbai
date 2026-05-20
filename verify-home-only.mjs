import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://dongfangbai.shuqiu7628.workers.dev';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

const page = await ctx.newPage();
await page.goto(BASE + '/?skipboot=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(__dirname, 'shots-post-cleanup', '01-home-1-post.png'), fullPage: true });
console.log('-> home');

const page2 = await ctx.newPage();
await page2.goto(BASE + '/posts/case-001?skipboot=1', { waitUntil: 'networkidle' });
await page2.waitForTimeout(1500);
await page2.screenshot({ path: path.join(__dirname, 'shots-post-cleanup', '02-case-001.png'), fullPage: true });
console.log('-> case-001');

await browser.close();
