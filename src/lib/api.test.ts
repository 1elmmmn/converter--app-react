import { describe, expect, it, vi } from 'vitest';
import { ER_API, mockFetch, THREE_DAYS } from '../test/fixtures';
import { CBR_URL, fetchJson, isAbortError, loadRates } from './api';
import { load, save } from './storage';

describe('fetchJson', () => {
  it('возвращает JSON успешного ответа', async () => {
    mockFetch({ 'https://example.com/a': { ok: 1 } });
    expect(await fetchJson('https://example.com/a')).toEqual({ ok: 1 });
  });

  it('бросает ошибку на ответ не 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(fetchJson('https://example.com/a')).rejects.toThrow('HTTP 500');
  });

  it('отменяет запрос по таймауту', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    );
    await expect(fetchJson('https://example.com/slow', 20)).rejects.toSatisfy(isAbortError);
  });
});

describe('loadRates', () => {
  it('берёт курсы ЦБ РФ и сохраняет их про запас', async () => {
    mockFetch(THREE_DAYS);
    const { data, stale } = await loadRates();
    expect(stale).toBe(false);
    expect(data.source).toBe('ЦБ РФ');
    expect(data.rates.USD?.rub).toBe(80);
    expect(load('rates')).toMatchObject({ source: 'ЦБ РФ' });
  });

  it('переходит на запасной источник, если ЦБ недоступен', async () => {
    mockFetch({ 'https://open.er-api.com/v6/latest/USD': ER_API });
    const { data, stale } = await loadRates();
    expect(stale).toBe(false);
    expect(data.source).toBe('open.er-api.com');
    expect(data.rates.RUB?.rub).toBe(1);
  });

  it('показывает сохранённые курсы, если сеть недоступна совсем', async () => {
    mockFetch(THREE_DAYS);
    await loadRates(); // курсы сохранились
    mockFetch({});
    const { data, stale } = await loadRates();
    expect(stale).toBe(true);
    expect(data.date).toBe('2026-10-10');
  });

  it('бросает ошибку, если нет ни сети, ни сохранённых курсов', async () => {
    mockFetch({});
    await expect(loadRates()).rejects.toThrow('Курсы недоступны');
  });

  it('игнорирует повреждённые сохранённые курсы', async () => {
    save('rates', { rates: 'мусор' });
    mockFetch({});
    await expect(loadRates()).rejects.toThrow('Курсы недоступны');
  });

  it('при отмене не переходит к следующим источникам', async () => {
    const fetchMock = mockFetch({});
    const controller = new AbortController();
    controller.abort();
    await expect(loadRates(controller.signal)).rejects.toSatisfy(isAbortError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(CBR_URL);
  });
});
