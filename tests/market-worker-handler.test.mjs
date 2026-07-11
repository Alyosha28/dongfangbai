import assert from 'node:assert/strict';
import test from 'node:test';

import { handleMarketRequest } from '../workers/market-feed/src/handler.ts';

const allowedOrigin = 'https://finalwhite.lol';

function rawUpstreamResponse() {
  const fields = Array.from({ length: 33 }, () => '0');
  fields[3] = '4780.79';
  fields[30] = '20260710161408';
  fields[31] = '-95.52';
  fields[32] = '-1.96';
  return new Response(`v_sh000300="${fields.join('~')}";`);
}

function request(path = '/markets', init = {}) {
  return new Request(`https://feed.example${path}`, {
    headers: { Origin: allowedOrigin, ...(init.headers ?? {}) },
    ...init,
  });
}

test('serves normalized JSON with explicit CORS and cache headers', async () => {
  const puts = [];
  const response = await handleMarketRequest(request(), {
    fetchUpstream: async () => rawUpstreamResponse(),
    cache: { match: async () => undefined, put: async (...args) => puts.push(args) },
    waitUntil: (promise) => promise,
    now: () => new Date('2026-07-10T08:15:00Z'),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=20');
  assert.equal(puts.length, 1);
  const body = await response.json();
  assert.equal(body.source, 'Tencent');
  assert.deepEqual(body.quotes.map((quote) => quote.id), ['CSI300']);
});

test('returns a cache hit without contacting the upstream source', async () => {
  let upstreamCalls = 0;
  const cached = new Response('{"cached":true}', { status: 200 });
  const response = await handleMarketRequest(request(), {
    fetchUpstream: async () => { upstreamCalls += 1; return rawUpstreamResponse(); },
    cache: { match: async () => cached, put: async () => undefined },
    waitUntil: () => undefined,
    now: () => new Date(),
  });

  assert.equal(upstreamCalls, 0);
  assert.deepEqual(await response.json(), { cached: true });
});

test('handles preflight, unsupported methods, paths, and origins', async () => {
  const deps = {
    fetchUpstream: async () => rawUpstreamResponse(),
    cache: { match: async () => undefined, put: async () => undefined },
    waitUntil: () => undefined,
    now: () => new Date(),
  };

  const preflight = await handleMarketRequest(request('/markets', { method: 'OPTIONS' }), deps);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), allowedOrigin);

  assert.equal((await handleMarketRequest(request('/markets', { method: 'POST' }), deps)).status, 405);
  assert.equal((await handleMarketRequest(request('/missing'), deps)).status, 404);
  assert.equal((await handleMarketRequest(request('/markets', { headers: { Origin: 'https://evil.example' } }), deps)).status, 403);
});

test('returns a structured 502 when the upstream fails or has no valid quotes', async () => {
  const deps = {
    fetchUpstream: async () => new Response('broken'),
    cache: { match: async () => undefined, put: async () => undefined },
    waitUntil: () => undefined,
    now: () => new Date(),
  };
  const response = await handleMarketRequest(request(), deps);

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: 'UPSTREAM_INVALID',
    message: 'Market data is temporarily unavailable.',
    reason: 'NO_VALID_QUOTES',
  });
});
