import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeQuoteTimestamp,
  parseTencentQuotes,
} from '../workers/market-feed/src/core.ts';

function quoteLine(symbol, { value, change, percent, timestamp }) {
  const fields = Array.from({ length: 33 }, () => '0');
  fields[3] = String(value);
  fields[30] = timestamp;
  fields[31] = String(change);
  fields[32] = String(percent);
  return `v_${symbol}="${fields.join('~')}";`;
}

function marketFixture() {
  const text = [
    quoteLine('sh000688', { value: 2064.98, change: -120.85, percent: -5.53, timestamp: '20260710161408' }),
    quoteLine('usIXIC', { value: 26281.61, change: 74.72, percent: 0.29, timestamp: '2026-07-10 17:15:59' }),
    quoteLine('sh000905', { value: 8503.97, change: -148.82, percent: -1.72, timestamp: '20260710161408' }),
    quoteLine('usINX', { value: 7575.39, change: 31.75, percent: 0.42, timestamp: '2026-07-10 17:28:30' }),
    quoteLine('sh000300', { value: 4780.79, change: -95.52, percent: -1.96, timestamp: '20260710161408' }),
  ].join('\n');
  const bytes = new TextEncoder().encode(text);
  return Uint8Array.from([0xb4, 0xf3, 0xc5, 0xcc, 32, ...bytes]);
}

test('parses all five whitelisted indices from a Tencent quote response', () => {
  const quotes = parseTencentQuotes(marketFixture());

  assert.deepEqual(quotes.map((quote) => quote.id), [
    'NASDAQ',
    'SP500',
    'CSI300',
    'STAR50',
    'CSI500',
  ]);
  assert.deepEqual(quotes[0], {
    id: 'NASDAQ',
    value: 26281.61,
    change: 74.72,
    percent: 0.29,
    quotedAt: '2026-07-10T17:15:59-04:00',
  });
  assert.equal(quotes[2].quotedAt, '2026-07-10T16:14:08+08:00');
});

test('drops unknown symbols, non-finite values, and incomplete records', () => {
  const text = [
    quoteLine('unknown', { value: 1, change: 1, percent: 1, timestamp: '20260710161408' }),
    quoteLine('usIXIC', { value: 'bad', change: 1, percent: 1, timestamp: '2026-07-10 17:15:59' }),
    'v_usINX="broken";',
  ].join('\n');

  assert.deepEqual(parseTencentQuotes(new TextEncoder().encode(text)), []);
});

test('normalizes China time and New York daylight-saving offsets', () => {
  assert.equal(normalizeQuoteTimestamp('20260710161408', 'CN'), '2026-07-10T16:14:08+08:00');
  assert.equal(normalizeQuoteTimestamp('2026-07-10 17:15:59', 'US'), '2026-07-10T17:15:59-04:00');
  assert.equal(normalizeQuoteTimestamp('2026-01-10 17:15:59', 'US'), '2026-01-10T17:15:59-05:00');
});
