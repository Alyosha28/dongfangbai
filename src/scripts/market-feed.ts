import { getQuoteStatus, getRetryDelay, validateMarketFeed, type MarketQuote, type QuoteStatus } from './market-feed-core';

const ENDPOINT = 'https://dongfangbai-market-feed.shuqiu7628.workers.dev/markets';
const REFRESH_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

function formatTime(quote: MarketQuote): string {
  const china = ['CSI300', 'STAR50', 'CSI500'].includes(quote.id);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: china ? 'Asia/Shanghai' : 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(quote.quotedAt));
}

function updateQuote(root: HTMLElement, quote: MarketQuote, now: Date): QuoteStatus {
  const row = root.querySelector<HTMLElement>(`[data-market="${quote.id}"]`);
  if (!row) return 'STALE';
  const value = row.querySelector<HTMLElement>('[data-role="value"]');
  const percent = row.querySelector<HTMLElement>('[data-role="percent"]');
  const time = row.querySelector<HTMLElement>('[data-role="time"]');
  const status = row.querySelector<HTMLElement>('[data-role="status"]');
  const quoteStatus = getQuoteStatus(quote, now);
  if (value) value.textContent = quote.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (percent) {
    percent.textContent = `${quote.percent > 0 ? '+' : ''}${quote.percent.toFixed(2)}%`;
    percent.className = `pct${quote.percent > 0 ? ' up' : quote.percent < 0 ? ' down' : ''}`;
  }
  if (time) time.textContent = formatTime(quote);
  if (status) {
    status.textContent = quoteStatus;
    status.dataset.state = quoteStatus.toLowerCase();
  }
  return quoteStatus;
}

export function startMarketFeed(): (() => void) | undefined {
  const root = document.getElementById('marketHud');
  if (!root) return undefined;
  const overallStatus = document.getElementById('marketStatus');
  const updated = document.getElementById('marketUpdated');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeRequest: AbortController | undefined;
  let failures = 0;
  let stopped = false;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    if (!stopped && !document.hidden) timer = setTimeout(refresh, delay);
  };
  const refresh = async () => {
    if (stopped || document.hidden || activeRequest) return;
    activeRequest = new AbortController();
    const timeout = setTimeout(() => activeRequest?.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(ENDPOINT, { signal: activeRequest.signal });
      if (!response.ok) throw new Error(`Market feed returned ${response.status}`);
      const feed = validateMarketFeed(await response.json());
      const now = new Date();
      const statuses = feed.quotes.map((quote) => updateQuote(root, quote, now));
      const summary = statuses.includes('LIVE') ? 'LIVE' : statuses.includes('STALE') ? 'STALE' : 'CLOSED';
      if (overallStatus) {
        overallStatus.textContent = summary;
        overallStatus.dataset.state = summary.toLowerCase();
      }
      if (updated) updated.textContent = `更新 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(feed.fetchedAt))}`;
      failures = 0;
      schedule(REFRESH_MS);
    } catch (error) {
      if (overallStatus) {
        overallStatus.textContent = 'OFFLINE';
        overallStatus.dataset.state = 'offline';
      }
      console.warn('Unable to refresh market data.', error);
      schedule(getRetryDelay(failures));
      failures += 1;
    } finally {
      clearTimeout(timeout);
      activeRequest = undefined;
    }
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTimeout(timer);
      activeRequest?.abort();
    } else void refresh();
  };
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    activeRequest?.abort();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', stop, { once: true });
  void refresh();
  return stop;
}
