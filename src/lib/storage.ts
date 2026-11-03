/** Обёртка над localStorage: не падает в приватном режиме или при переполнении. */
const PREFIX = 'currency-converter:';

export function load(key: string): unknown {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? undefined : JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — приложение продолжает работать без сохранения */
  }
}
