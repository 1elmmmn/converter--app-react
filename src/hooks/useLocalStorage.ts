import { useEffect, useState } from 'react';
import { load, save } from '../lib/storage';

/**
 * Состояние, которое сохраняется в localStorage.
 * `parse` проверяет сохранённое значение и возвращает безопасное (или значение по умолчанию).
 */
export function useLocalStorage<T>(key: string, parse: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => parse(load(key)));

  useEffect(() => {
    save(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
