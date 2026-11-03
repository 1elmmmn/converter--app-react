import { useEffect, useState } from 'react';
import { fetchJson } from '../lib/api';
import { parseCbr } from '../lib/converter';
import type { RatesSnapshot } from '../types';

export const HISTORY_DAYS = 14;

interface Loaded {
  root: RatesSnapshot; // для каких курсов загружена история
  days: RatesSnapshot[]; // от новых к старым
  done: boolean;
}

/**
 * Курсы за последние дни: идём по ссылкам PreviousURL от свежих курсов ЦБ к старым.
 * Если загрузка оборвалась, показываем то, что успели получить.
 * `enabled = false` — например, когда показаны сохранённые курсы без сети.
 */
export function useRateHistory(data: RatesSnapshot | null, enabled: boolean) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!data || !enabled || !data.previousUrl) return;
    const controller = new AbortController();

    void (async () => {
      const days = [data];
      let url = data.previousUrl;
      while (url && days.length < HISTORY_DAYS) {
        try {
          const day = parseCbr(await fetchJson(url, 6000, controller.signal));
          days.push(day);
          url = day.previousUrl;
          setLoaded({ root: data, days: [...days], done: false });
        } catch {
          break;
        }
      }
      if (!controller.signal.aborted) setLoaded({ root: data, days: [...days], done: true });
    })();

    return () => controller.abort();
  }, [data, enabled]);

  // Результат относится к конкретным курсам: для других курсов он не показывается.
  const current = data && loaded?.root === data ? loaded : null;
  return {
    days: current?.days ?? (data ? [data] : []),
    loading: Boolean(data?.previousUrl) && enabled && !current?.done,
  };
}
