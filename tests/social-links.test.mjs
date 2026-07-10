import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const layoutPath = new URL('../src/layouts/Site.astro', import.meta.url);
const aboutPath = new URL('../src/pages/about.astro', import.meta.url);

test('site-wide social links point to the owner profiles', async () => {
  const [layout, about] = await Promise.all([
    readFile(layoutPath, 'utf8'),
    readFile(aboutPath, 'utf8'),
  ]);

  assert.match(layout, /href="https:\/\/github\.com\/Alyosha28"/);
  assert.match(layout, /href="https:\/\/x\.com\/finalwhit76"/);
  assert.match(about, /href="https:\/\/github\.com\/Alyosha28"/);
  assert.match(about, /href="https:\/\/x\.com\/finalwhit76"/);

  assert.doesNotMatch(layout, /href="https:\/\/github\.com\/"/);
  assert.doesNotMatch(layout, /href="https:\/\/x\.com\/"/);
  assert.doesNotMatch(about, /href="https:\/\/x\.com\/"/);
});
