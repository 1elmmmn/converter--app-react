import type { RatesSnapshot } from '../types';
import { parseCbr, parseErApi } from './converter';
import { parseSnapshot } from './parse';
import { load, save } from './storage';

export const CBR_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';
export const FALLBACK_URL = 'https://open.er-api.com/v6/latest/USD';

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * GET-запрос с таймаутом. Запрос отменяется и по таймауту, и по внешнему `signal`
 * (например, когда компонент размонтирован).
 */
export async function fetchJson(url: string, timeoutMs = 8000, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface LoadedRates {
  data: RatesSnapshot;
  /** true — сеть недоступна, показаны ранее сохранённые курсы. */
  stale: boolean;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

/** Цепочка надёжности: ЦБ РФ -> запасной API -> курсы, сохранённые в браузере. */
export async function loadRates(signal?: AbortSignal): Promise<LoadedRates> {
  try {
    const data = parseCbr(await fetchJson(CBR_URL, 8000, signal));
    save('rates', data);
    return { data, stale: false };
  } catch {
    throwIfAborted(signal);
  }

  try {
    const data = parseErApi(await fetchJson(FALLBACK_URL, 8000, signal));
    save('rates', data);
    return { data, stale: false };
  } catch {
    throwIfAborted(signal);
  }

  const cached = parseSnapshot(load('rates'));
  if (cached) return { data: cached, stale: true };
  throw new Error('Курсы недоступны');
}
