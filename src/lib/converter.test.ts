import { expect, test } from 'vitest';
import * as C from './converter';

const cbrSample = {
  Date: '2026-10-10T11:30:00+03:00',
  PreviousURL: '//www.cbr-xml-daily.ru/archive/2026/10/09/daily_json.js',
  Valute: {
    USD: { CharCode: 'USD', Name: 'Доллар США', Nominal: 1, Value: 80, Previous: 79 },
    EUR: { CharCode: 'EUR', Name: 'Евро', Nominal: 1, Value: 90, Previous: 91 },
    JPY: { CharCode: 'JPY', Name: 'Японских иен', Nominal: 100, Value: 55, Previous: 54 },
  },
};

test('parseCbr: учитывает номинал и добавляет рубль', () => {
  const r = C.parseCbr(cbrSample);
  expect(r.rates.RUB?.rub).toBe(1);
  expect(r.rates.JPY?.rub).toBe(0.55);
  expect(r.date).toBe('2026-10-10');
  expect(r.previousUrl).toBe('https://www.cbr-xml-daily.ru/archive/2026/10/09/daily_json.js');
});

test('parseCbr: бросает ошибку на мусоре', () => {
  expect(() => C.parseCbr({})).toThrow();
  expect(() => C.parseCbr(null)).toThrow();
});

test('convert: прямая и кросс-конвертация', () => {
  const { rates } = C.parseCbr(cbrSample);
  expect(C.convert(10, 'USD', 'RUB', rates)).toBe(800);
  expect(C.convert(800, 'RUB', 'USD', rates)).toBe(10);
  expect(Math.abs(C.convert(90, 'USD', 'EUR', rates) - 80) < 1e-9).toBeTruthy();
  expect(() => C.convert(1, 'USD', 'XXX', rates)).toThrow();
});

test('convert: туда-обратно возвращает исходную сумму', () => {
  const { rates } = C.parseCbr(cbrSample);
  const there = C.convert(123.45, 'EUR', 'JPY', rates);
  expect(Math.abs(C.convert(there, 'JPY', 'EUR', rates) - 123.45) < 1e-9).toBeTruthy();
});

test('parseErApi: считает рубли за единицу валюты', () => {
  const r = C.parseErApi({ result: 'success', rates: { USD: 1, RUB: 80, EUR: 0.9 } });
  expect(r.rates.USD?.rub).toBe(80);
  expect(Math.abs((r.rates.EUR?.rub ?? 0) - 80 / 0.9) < 1e-9).toBeTruthy();
  expect(() => C.parseErApi({ result: 'error' })).toThrow();
});

test('parseAmount: разные форматы ввода', () => {
  expect(C.parseAmount('100')).toBe(100);
  expect(C.parseAmount('1 000,50')).toBe(1000.5);
  expect(C.parseAmount('1 000,5')).toBe(1000.5);
  expect(C.parseAmount('1,000.50')).toBe(1000.5);
  expect(C.parseAmount('1.000,50')).toBe(1000.5);
  expect(C.parseAmount('0,5')).toBe(0.5);
  expect(C.parseAmount('0')).toBe(0);
});

test('parseAmount: мусор и отрицательные значения -> NaN', () => {
  for (const bad of ['', '   ', 'abc', '-5', '1e5', '1.2.3', '1,2,3', '12a', null, undefined]) {
    expect(Number.isNaN(C.parseAmount(bad))).toBeTruthy();
  }
});

test('formatNumber: два знака и значимые цифры для малых сумм', () => {
  expect(C.formatNumber(1234.5, 'en-US')).toBe('1,234.50');
  expect(C.formatNumber(0.012345, 'en-US')).toBe('0.01235');
  expect(C.formatNumber(NaN)).toBe('—');
});

test('percentChange', () => {
  expect(C.percentChange(110, 100)).toBe(10);
  expect(C.percentChange(90, 100)).toBe(-10);
  expect(C.percentChange(5, 0)).toBe(0);
});

test('sortCodes: популярные сверху, остальные по алфавиту', () => {
  const { popular, rest } = C.sortCodes(['ZAR', 'USD', 'AUD', 'RUB'], ['RUB', 'USD', 'EUR']);
  expect(popular).toEqual(['RUB', 'USD']);
  expect(rest).toEqual(['AUD', 'ZAR']);
});
