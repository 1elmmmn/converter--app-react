/** Одна валюта: rub — стоимость ОДНОЙ единицы валюты в рублях. */
export interface Rate {
  code: string;
  name: string;
  rub: number;
  prevRub: number;
}

/** Курсы на одну дату во внутреннем формате (не зависит от источника). */
export interface RatesSnapshot {
  source: string;
  date: string; // ISO: 2026-10-10
  rates: Record<string, Rate>;
  previousUrl: string | null;
}

export interface Pair {
  from: string;
  to: string;
}

export interface HistoryItem {
  amount: number;
  from: string;
  to: string;
  value: number;
}

export type Theme = 'light' | 'dark';
