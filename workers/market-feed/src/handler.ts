import { parseTencentQuotes } from './core.ts';

const UPSTREAM_URL =
  'https://qt.gtimg.cn/q=sh000300,sh000688,sh000905,usIXIC,usINX';
const CACHE_SECONDS = 20;
const UPSTREAM_TIMEOUT_MS = 5000;
const ALLOWED_ORIGINS = new Set([
  'https://finalwhite.lol',
  'https://www.finalwhite.lol',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);

interface CacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<unknown>;
}

interface MarketHandlerDependencies {
  fetchUpstream: typeof fetch;
  cache: CacheLike;
  waitUntil(promise: Promise<unknown>): unknown;
  now(): Date;
}

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  });
}

function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders(origin))) {
    headers.set(name, String(value));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function upstreamError(origin: string | null, reason: string): Response {
  return jsonResponse(
    {
      error: 'UPSTREAM_INVALID',
      message: 'Market data is temporarily unavailable.',
      reason,
    },
    502,
    origin,
    { 'Cache-Control': 'no-store' },
  );
}

export async function handleMarketRequest(
  request: Request,
  dependencies: MarketHandlerDependencies,
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: 'ORIGIN_FORBIDDEN' }, 403, null);
  }
  if (url.pathname !== '/markets') {
    return jsonResponse({ error: 'NOT_FOUND' }, 404, origin);
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, origin, {
      Allow: 'GET, OPTIONS',
    });
  }

  const cacheKey = new Request(`${url.origin}/markets`, { method: 'GET' });
  const cached = await dependencies.cache.match(cacheKey);
  if (cached) return withCors(cached, origin);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await dependencies.fetchUpstream(UPSTREAM_URL, {
      signal: abortController.signal,
    });
    if (!upstream.ok) {
      console.warn('Market upstream returned a non-success status.', upstream.status);
      return upstreamError(origin, `HTTP_${upstream.status}`);
    }

    const quotes = parseTencentQuotes(new Uint8Array(await upstream.arrayBuffer()));
    if (quotes.length === 0) {
      console.warn('Market upstream response contained no valid quotes.');
      return upstreamError(origin, 'NO_VALID_QUOTES');
    }

    const cacheable = jsonResponse(
      {
        source: 'Tencent',
        fetchedAt: dependencies.now().toISOString(),
        quotes,
      },
      200,
      null,
      { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
    );
    dependencies.waitUntil(dependencies.cache.put(cacheKey, cacheable.clone()));
    return withCors(cacheable, origin);
  } catch (error) {
    console.error('Market upstream request failed.', error);
    const reason = error instanceof Error && error.name === 'AbortError'
      ? 'TIMEOUT'
      : 'FETCH_FAILED';
    return upstreamError(origin, reason);
  } finally {
    clearTimeout(timeout);
  }
}
