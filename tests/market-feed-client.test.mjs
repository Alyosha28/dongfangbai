import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getQuoteStatus,
  getRetryDelay,
  validateMarketFeed,
} from '../src/scripts/market-feed-core.ts';

const baseQuote = {
  id: 'CSI300',
  value: 4780.79,
  change: -95.52,
  percent: -1.96,
  quotedAt: '2026-07-10T09:55:00+08:00',
};

test('validates a complete market feed and rejects unsafe records', () => {
  const valid = validateMarketFeed({
    source: 'Tencent',
    fetchedAt: '2026-07-10T02:00:00.000Z',
    quotes: [baseQuote],
  });
  assert.equal(valid.quotes.length, 1);

  assert.throws(() => validateMarketFeed({
    source: 'Tencent',
    fetchedAt: '2026-07-10T02:00:00.000Z',
    quotes: [{ ...baseQuote, id: 'UNKNOWN' }],
  }), /Invalid market feed/);
  assert.throws(() => validateMarketFeed({
    source: 'Tencent',
    fetchedAt: '2026-07-10T02:00:00.000Z',
    quotes: [{ ...baseQuote, value: Number.POSITIVE_INFINITY }],
  }), /Invalid market feed/);
});

test('classifies live, stale, and closed China-market quotes', () => {
  assert.equal(
    getQuoteStatus(baseQuote, new Date('2026-07-10T02:00:00Z')),
    'LIVE',
  );
  assert.equal(
    getQuoteStatus({ ...baseQuote, quotedAt: '2026-07-10T09:40:00+08:00' }, new Date('2026-07-10T02:00:00Z')),
    'STALE',
  );
  assert.equal(
    getQuoteStatus(baseQuote, new Date('2026-07-11T02:00:00Z')),
    'CLOSED',
  );
});

test('classifies a fresh US quote during the New York session', () => {
  const quote = {
    ...baseQuote,
    id: 'NASDAQ',
    quotedAt: '2026-07-10T10:58:00-04:00',
  };
  assert.equal(getQuoteStatus(quote, new Date('2026-07-10T15:00:00Z')), 'LIVE');
});

test('caps retry backoff at two minutes', () => {
  assert.deepEqual([0, 1, 2, 3].map(getRetryDelay), [30000, 60000, 120000, 120000]);
});

