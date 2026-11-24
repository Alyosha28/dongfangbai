import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const profilePath = new URL('../src/data/profile.yaml', import.meta.url);
const footerCheckPaths = [
  new URL('../dist/index.html', import.meta.url),
  new URL('../dist/about/index.html', import.meta.url),
];

test('site-wide social links point to the owner profiles', async () => {
  const profile = await readFile(profilePath, 'utf8');

  assert.match(profile, /https:\/\/github\.com\/Alyosha28/);
  assert.match(profile, /https:\/\/x\.com\/finalwhit76/);
  assert.match(profile, /mailto:hi@dongfangbai\.com/);

  assert.doesNotMatch(profile, /url:\s*"https:\/\/github\.com\/"/);
  assert.doesNotMatch(profile, /url:\s*"https:\/\/x\.com\/"/);

  for (const htmlUrl of footerCheckPaths) {
    const html = await readFile(htmlUrl, 'utf8');
    assert.match(html, /href="https:\/\/github\.com\/Alyosha28"/);
    assert.match(html, /href="https:\/\/x\.com\/finalwhit76"/);
    assert.match(html, /href="mailto:hi@dongfangbai\.com"/);
  }
});
