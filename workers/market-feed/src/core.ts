export type MarketId = 'NASDAQ' | 'SP500' | 'CSI300' | 'STAR50' | 'CSI500';

export interface MarketQuotePayload {
  id: MarketId;
  value: number;
  change: number;
  percent: number;
  quotedAt: string;
}

type MarketRegion = 'CN' | 'US';

const QUOTE_CONFIG: ReadonlyArray<{ symbol: string; id: MarketId; region: MarketRegion }> = [
  { symbol: 'usIXIC', id: 'NASDAQ', region: 'US' },
  { symbol: 'usINX', id: 'SP500', region: 'US' },
  { symbol: 'sh000300', id: 'CSI300', region: 'CN' },
  { symbol: 'sh000688', id: 'STAR50', region: 'CN' },
  { symbol: 'sh000905', id: 'CSI500', region: 'CN' },
];

const CONFIG_BY_SYMBOL = new Map(
  QUOTE_CONFIG.map((config) => [config.symbol, config]),
);

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number): number {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
}

function isNewYorkDaylightTime(year: number, month: number, day: number): boolean {
  if (month < 3 || month > 11) return false;
  if (month > 3 && month < 11) return true;
  if (month === 3) {
    return day >= nthWeekdayOfMonth(year, 2, 0, 2);
  }
  return day < nthWeekdayOfMonth(year, 10, 0, 1);
}

export function normalizeQuoteTimestamp(raw: string, region: MarketRegion): string | null {
  if (region === 'CN') {
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(raw);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+08:00`;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const offset = isNewYorkDaylightTime(year, month, day) ? '-04:00' : '-05:00';
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${offset}`;
}

function decodeAsciiPayload(bytes: Uint8Array): string {
  const asciiOnly = Uint8Array.from(bytes, (byte) => (byte < 0x80 ? byte : 0x20));
  return new TextDecoder().decode(asciiOnly);
}

export function parseTencentQuotes(bytes: Uint8Array): MarketQuotePayload[] {
  const body = decodeAsciiPayload(bytes);
  const parsed = new Map<MarketId, MarketQuotePayload>();
  const quotePattern = /v_([A-Za-z0-9]+)="([^"]*)";/g;

  for (const match of body.matchAll(quotePattern)) {
    const config = CONFIG_BY_SYMBOL.get(match[1]);
    if (!config) continue;

    const fields = match[2].split('~');
    const value = Number(fields[3]);
    const change = Number(fields[31]);
    const percent = Number(fields[32]);
    const quotedAt = normalizeQuoteTimestamp(fields[30] ?? '', config.region);
    if (
      fields[3] === ''
      || fields[31] === ''
      || fields[32] === ''
      || !Number.isFinite(value)
      || !Number.isFinite(change)
      || !Number.isFinite(percent)
      || !quotedAt
    ) continue;

    parsed.set(config.id, { id: config.id, value, change, percent, quotedAt });
  }

  return QUOTE_CONFIG.flatMap((config) => {
    const quote = parsed.get(config.id);
    return quote ? [quote] : [];
  });
}
