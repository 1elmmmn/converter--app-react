import { useEffect, useState } from 'react';
import { isAbortError, loadRates } from '../lib/api';
import type { RatesSnapshot } from '../types';

export type RatesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: RatesSnapshot; stale: boolean };

/** Загружает курсы один раз при открытии страницы; при уходе со страницы отменяет запросы. */
export function useRates(): RatesState {
  const [state, setState] = useState<RatesState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    loadRates(controller.signal).then(
      ({ data, stale }) => setState({ status: 'ready', data, stale }),
      (error: unknown) => {
        if (!isAbortError(error)) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, []);

  return state;
}
