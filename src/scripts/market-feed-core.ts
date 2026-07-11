export type MarketId = 'NASDAQ' | 'SP500' | 'CSI300' | 'STAR50' | 'CSI500';
export type QuoteStatus = 'LIVE' | 'STALE' | 'CLOSED';

export interface MarketQuote {
  id: MarketId;
  value: number;
  change: number;
  percent: number;
  quotedAt: string;
}

export interface MarketFeed {
  source: 'Tencent';
  fetchedAt: string;
  quotes: MarketQuote[];
}

const MARKET_IDS = new Set<MarketId>(['NASDAQ', 'SP500', 'CSI300', 'STAR50', 'CSI500']);
const CHINA_IDS = new Set<MarketId>(['CSI300', 'STAR50', 'CSI500']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateMarketFeed(value: unknown): MarketFeed {
  if (!isRecord(value) || value.source !== 'Tencent' || !isValidDate(value.fetchedAt) || !Array.isArray(value.quotes)) {
    throw new Error('Invalid market feed');
  }
  const seen = new Set<MarketId>();
  for (const quote of value.quotes) {
    if (!isRecord(quote) || typeof quote.id !== 'string' || !MARKET_IDS.has(quote.id as MarketId)
      || seen.has(quote.id as MarketId) || !isFiniteNumber(quote.value) || !isFiniteNumber(quote.change)
      || !isFiniteNumber(quote.percent) || !isValidDate(quote.quotedAt)) {
      throw new Error('Invalid market feed');
    }
    seen.add(quote.id as MarketId);
  }
  return value as unknown as MarketFeed;
}

function zonedParts(date: Date, timeZone: string): { weekday: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { weekday: get('weekday'), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function marketIsOpen(id: MarketId, now: Date): boolean {
  const china = CHINA_IDS.has(id);
  const { weekday, minutes } = zonedParts(now, china ? 'Asia/Shanghai' : 'America/New_York');
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  return china
    ? (minutes >= 570 && minutes <= 690) || (minutes >= 780 && minutes <= 900)
    : minutes >= 570 && minutes <= 960;
}

export function getQuoteStatus(quote: MarketQuote, now = new Date()): QuoteStatus {
  if (!marketIsOpen(quote.id, now)) return 'CLOSED';
  const age = now.getTime() - new Date(quote.quotedAt).getTime();
  return age >= -60_000 && age <= 10 * 60_000 ? 'LIVE' : 'STALE';
}

export function getRetryDelay(attempt: number): number {
  return Math.min(30_000 * (2 ** Math.max(0, attempt)), 120_000);
}
