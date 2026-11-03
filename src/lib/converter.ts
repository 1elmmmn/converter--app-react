/**
 * Чистая логика конвертера: без DOM, React и сети, поэтому её легко тестировать.
 *
 * Внутренний формат курсов: см. RatesSnapshot (types.ts).
 * Кросс-курс любой пары считается через рубль.
 */
import type { Rate, RatesSnapshot } from '../types';

const RUB: Rate = { code: 'RUB', name: 'Российский рубль', rub: 1, prevRub: 1 };

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUrl(url: string): string {
  return url.startsWith('//') ? 'https:' + url : url;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Ответ ЦБ РФ (cbr-xml-daily.ru) -> внутренний формат. Бросает ошибку на мусоре. */
export function parseCbr(data: unknown): RatesSnapshot {
  if (!isRecord(data) || !isRecord(data.Valute)) throw new Error('Некорректный ответ ЦБ');

  const rates: Record<string, Rate> = { RUB: { ...RUB } };
  for (const v of Object.values(data.Valute)) {
    if (!isRecord(v)) continue;
    const nominal = Number(v.Nominal);
    const value = Number(v.Value);
    const previous = Number(v.Previous);
    if (!nominal || !value || typeof v.CharCode !== 'string') continue;
    rates[v.CharCode] = {
      code: v.CharCode,
      name: String(v.Name),
      rub: value / nominal,
      prevRub: (previous || value) / nominal,
    };
  }

  return {
    source: 'ЦБ РФ',
    date: String(data.Date ?? '').slice(0, 10),
    rates,
    previousUrl: typeof data.PreviousURL === 'string' && data.PreviousURL ? normalizeUrl(data.PreviousURL) : null,
  };
}

/** Запасной источник (open.er-api.com, база USD) -> внутренний формат. */
export function parseErApi(data: unknown): RatesSnapshot {
  if (!isRecord(data) || data.result !== 'success' || !isRecord(data.rates) || !data.rates.RUB) {
    throw new Error('Некорректный ответ запасного API');
  }

  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['ru'], { type: 'currency' });
  } catch {
    /* старый браузер: оставим коды вместо названий */
  }

  const rubPerUsd = Number(data.rates.RUB);
  const rates: Record<string, Rate> = {};
  for (const [code, perUsd] of Object.entries(data.rates)) {
    const k = Number(perUsd);
    if (!k) continue;
    const rub = rubPerUsd / k;
    let name = code;
    try {
      name = names?.of(code) ?? code;
    } catch {
      /* неизвестный код валюты */
    }
    rates[code] = { code, name: capitalize(name), rub, prevRub: rub };
  }

  const updated = typeof data.time_last_update_utc === 'string' ? new Date(data.time_last_update_utc) : null;
  return {
    source: 'open.er-api.com',
    date: updated && !Number.isNaN(updated.getTime()) ? updated.toISOString().slice(0, 10) : '',
    rates,
    previousUrl: null,
  };
}

/** Конвертация через рубль. */
export function convert(amount: number, from: string, to: string, rates: Record<string, Rate>): number {
  const a = rates[from];
  const b = rates[to];
  if (!a || !b) throw new Error('Неизвестная валюта');
  return (amount * a.rub) / b.rub;
}

/** Курс 1 from = X to. */
export function pairRate(from: string, to: string, rates: Record<string, Rate>): number {
  return convert(1, from, to, rates);
}

/**
 * Разбор введённой пользователем суммы.
 * Понимает "1 000,50", "1,000.50", "1000.5"; \s убирает и обычные, и неразрывные пробелы.
 * Возвращает NaN для мусора и отрицательных чисел.
 */
export function parseAmount(input: unknown): number {
  if (typeof input !== 'string') return NaN;
  let s = input.replace(/\s/g, '');
  if (!s || !/^[0-9.,]+$/.test(s)) return NaN;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    // последний разделитель — десятичный, остальные — разряды
    const dec = lastDot > lastComma ? '.' : ',';
    const grp = dec === '.' ? ',' : '.';
    s = s.split(grp).join('').replace(dec, '.');
  } else if (lastComma !== -1) {
    if (s.split(',').length > 2) return NaN;
    s = s.replace(',', '.');
  } else if (s.split('.').length > 2) {
    return NaN;
  }

  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** Красивый вывод числа: 2 знака для обычных сумм, значимые цифры для очень маленьких. */
export function formatNumber(value: number, locale = 'ru-RU'): string {
  if (!Number.isFinite(value)) return '—';
  const options: Intl.NumberFormatOptions =
    value !== 0 && Math.abs(value) < 1
      ? { maximumSignificantDigits: 4 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Процентное изменение. */
export function percentChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

/** Список кодов: популярные сверху, остальные по алфавиту. */
export function sortCodes(codes: string[], popular: string[]): { popular: string[]; rest: string[] } {
  const pop = popular.filter((c) => codes.includes(c));
  const rest = codes.filter((c) => !pop.includes(c)).sort();
  return { popular: pop, rest };
}
