import { describe, expect, it } from 'vitest';
import { DEFAULT_PAIR, HISTORY_LIMIT, parseHistory, parsePair, parseSnapshot, parseTheme } from './parse';

describe('parseTheme', () => {
  it('принимает только light и dark', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('blue')).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
  });
});

describe('parsePair', () => {
  it('возвращает пару по умолчанию для мусора', () => {
    expect(parsePair({ from: 'EUR', to: 'CNY' })).toEqual({ from: 'EUR', to: 'CNY' });
    expect(parsePair({ from: 1, to: 'CNY' })).toEqual(DEFAULT_PAIR);
    expect(parsePair(null)).toEqual(DEFAULT_PAIR);
  });
});

describe('parseHistory', () => {
  it('оставляет только корректные записи и ограничивает длину', () => {
    const good = { amount: 100, from: 'USD', to: 'RUB', value: 8000 };
    const raw = [good, { ...good, amount: NaN }, { ...good, from: 5 }, 'x', ...Array.from({ length: 20 }, () => good)];
    const list = parseHistory(raw);
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list.every((item) => item.amount === 100)).toBe(true);
    expect(parseHistory('не массив')).toEqual([]);
  });
});

describe('parseSnapshot', () => {
  const rate = { code: 'USD', name: 'Доллар США', rub: 80, prevRub: 79 };

  it('восстанавливает корректные курсы', () => {
    const snapshot = parseSnapshot({ source: 'ЦБ РФ', date: '2026-10-10', rates: { USD: rate }, previousUrl: null });
    expect(snapshot?.rates.USD).toEqual(rate);
    expect(snapshot?.date).toBe('2026-10-10');
  });

  it('отбрасывает повреждённые валюты и пустые наборы', () => {
    expect(parseSnapshot({ rates: { USD: { ...rate, rub: -1 }, EUR: 'x' } })).toBeNull();
    expect(parseSnapshot({ rates: { USD: rate, EUR: { code: 'EUR' } } })?.rates).toEqual({ USD: rate });
    expect(parseSnapshot(null)).toBeNull();
  });
});
