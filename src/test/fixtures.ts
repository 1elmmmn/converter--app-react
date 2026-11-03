import { vi } from 'vitest';
import { CBR_URL, FALLBACK_URL } from '../lib/api';

export { CBR_URL, FALLBACK_URL };

export const ARCHIVE_1 = 'https://www.cbr-xml-daily.ru/archive/2026/10/09/daily_json.js';
export const ARCHIVE_2 = 'https://www.cbr-xml-daily.ru/archive/2026/10/08/daily_json.js';

interface DayOptions {
  date: string;
  usd: number;
  /** Ссылка на предыдущий день в формате ЦБ (без протокола). */
  previous?: string;
}

/** Ответ ЦБ РФ за один день: доллар, евро, юань и иена (номинал 100). */
export function makeCbr({ date, usd, previous }: DayOptions) {
  return {
    Date: `${date}T11:30:00+03:00`,
    ...(previous ? { PreviousURL: previous } : {}),
    Valute: {
      USD: { CharCode: 'USD', Name: 'Доллар США', Nominal: 1, Value: usd, Previous: usd },
      EUR: { CharCode: 'EUR', Name: 'Евро', Nominal: 1, Value: 90, Previous: 90 },
      CNY: { CharCode: 'CNY', Name: 'Китайский юань', Nominal: 1, Value: 11, Previous: 11 },
      JPY: { CharCode: 'JPY', Name: 'Японских иен', Nominal: 100, Value: 55, Previous: 55 },
    },
  };
}

/** Три рабочих дня: доллар 78 → 79 → 80. */
export const THREE_DAYS: Record<string, unknown> = {
  [CBR_URL]: makeCbr({ date: '2026-10-10', usd: 80, previous: '//www.cbr-xml-daily.ru/archive/2026/10/09/daily_json.js' }),
  [ARCHIVE_1]: makeCbr({ date: '2026-10-09', usd: 79, previous: '//www.cbr-xml-daily.ru/archive/2026/10/08/daily_json.js' }),
  [ARCHIVE_2]: makeCbr({ date: '2026-10-08', usd: 78 }),
};

export const ER_API = {
  result: 'success',
  time_last_update_utc: 'Sat, 10 Oct 2026 00:00:01 +0000',
  rates: { USD: 1, RUB: 80, EUR: 0.9 },
};

export function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

/** Подставляет fetch: адреса из `routes` отвечают данными, остальные — сетевой ошибкой. */
export function mockFetch(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url in routes) return jsonResponse(routes[url]);
    throw new TypeError('Failed to fetch: ' + url);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
