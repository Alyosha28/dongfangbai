import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeQuoteTimestamp,
  parseTencentQuotes,
} from '../workers/market-feed/src/core.ts';

const encoder = new TextEncoder();

function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function quoteLine({ variable, code, value, previous, timestamp, change, percent }) {
  const fields = Array(33).fill('');
  fields[0] = variable.startsWith('us') ? '200' : '1';
  fields[2] = code;
  fields[3] = String(value);
  fields[4] = String(previous);
  fields[30] = timestamp;
  fields[31] = String(change);
  fields[32] = String(percent);

  return concatBytes([
    encoder.encode(`v_${variable}="${fields[0]}~`),
    Uint8Array.from([0xbb, 0xa6, 0xc7, 0xe9]),
    encoder.encode(`~${fields.slice(2).join('~')}";\n`),
  ]);
}

function marketFixture() {
  return concatBytes([
    quoteLine({ variable: 'sh000300', code: '000300', value: 4780.79, previous: 4876.31, timestamp: '20260710161408', change: -95.52, percent: -1.96 }),
    quoteLine({ variable: 'sh000688', code: '000688', value: 2064.98, previous: 2185.83, timestamp: '20260710161414', change: -120.85, percent: -5.53 }),
    quoteLine({ variable: 'sh000905', code: '000905', value: 8503.97, previous: 8652.79, timestamp: '20260710161414', change: -148.82, percent: -1.72 }),
    quoteLine({ variable: 'usIXIC', code: '.IXIC', value: 26281.61, previous: 26206.89, timestamp: '2026-07-10 17:15:59', change: 74.72, percent: 0.29 }),
    quoteLine({ variable: 'usINX', code: '.INX', value: 7575.39, previous: 7543.64, timestamp: '2026-07-10 17:28:30', change: 31.75, percent: 0.42 }),
  ]);
}

test('parses all five whitelisted indices from raw GBK-compatible bytes', () => {
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
  const bytes = concatBytes([
    quoteLine({ variable: 'sh000300', code: '000300', value: 'NaN', previous: 1, timestamp: '20260710161408', change: 1, percent: 1 }),
    quoteLine({ variable: 'sh999999', code: '999999', value: 10, previous: 9, timestamp: '20260710161408', change: 1, percent: 1 }),
  ]);

  assert.deepEqual(parseTencentQuotes(bytes), []);
});

test('normalizes New York timestamps across daylight-saving boundaries', () => {
  assert.equal(
    normalizeQuoteTimestamp('2026-07-10 17:15:59', 'US'),
    '2026-07-10T17:15:59-04:00',
  );
  assert.equal(
    normalizeQuoteTimestamp('2026-01-10 17:15:59', 'US'),
    '2026-01-10T17:15:59-05:00',
  );
});

