/**
 * Всё, что приходит из localStorage, считаем недоверенным: проверяем форму данных
 * и возвращаем либо чистое значение, либо значение по умолчанию.
 */
import type { HistoryItem, Pair, Rate, RatesSnapshot, Theme } from '../types';
import { isRecord } from './converter';

export const DEFAULT_PAIR: Pair = { from: 'USD', to: 'RUB' };
export const HISTORY_LIMIT = 6;

export function parseTheme(raw: unknown): Theme | null {
  return raw === 'light' || raw === 'dark' ? raw : null;
}

export function parsePair(raw: unknown): Pair {
  if (isRecord(raw) && typeof raw.from === 'string' && typeof raw.to === 'string') {
    return { from: raw.from, to: raw.to };
  }
  return DEFAULT_PAIR;
}

export function parseHistory(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const list: HistoryItem[] = [];
  for (const item of raw as unknown[]) {
    if (!isRecord(item)) continue;
    const { amount, from, to, value } = item;
    if (
      typeof amount === 'number' && Number.isFinite(amount) &&
      typeof value === 'number' && Number.isFinite(value) &&
      typeof from === 'string' && typeof to === 'string'
    ) {
      list.push({ amount, from, to, value });
    }
  }
  return list.slice(0, HISTORY_LIMIT);
}

/** Сохранённые курсы (запасной вариант без сети). null — если данные повреждены. */
export function parseSnapshot(raw: unknown): RatesSnapshot | null {
  if (!isRecord(raw) || !isRecord(raw.rates)) return null;
  const rates: Record<string, Rate> = {};
  for (const r of Object.values(raw.rates)) {
    if (!isRecord(r)) continue;
    if (typeof r.code === 'string' && typeof r.name === 'string' && typeof r.rub === 'number' && r.rub > 0) {
      rates[r.code] = { code: r.code, name: r.name, rub: r.rub, prevRub: typeof r.prevRub === 'number' ? r.prevRub : r.rub };
    }
  }
  if (Object.keys(rates).length === 0) return null;
  return {
    source: typeof raw.source === 'string' ? raw.source : '',
    date: typeof raw.date === 'string' ? raw.date : '',
    rates,
    previousUrl: typeof raw.previousUrl === 'string' ? raw.previousUrl : null,
  };
}
