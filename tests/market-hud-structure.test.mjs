import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('HUD starts empty, contains the five requested indices, and has no fake market generator', async () => {
  const [component, client] = await Promise.all([
    readFile(new URL('../src/components/MarketHud.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/scripts/client.ts', import.meta.url), 'utf8'),
  ]);

  for (const id of ['NASDAQ', 'SP500', 'CSI300', 'STAR50', 'CSI500']) {
    assert.match(component, new RegExp(`data-market="${id}"`));
  }
  assert.doesNotMatch(component, /3274\.18|10422\.51|19281\.05|5847\.32/);
  assert.doesNotMatch(component, /SHCOMP|SZCOMP|HSI/);
  assert.doesNotMatch(client, /const mktBase|setInterval\(updateMarket/);
});
