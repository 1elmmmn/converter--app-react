import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, THREE_DAYS } from '../test/fixtures';
import { useRates } from './useRates';

describe('useRates', () => {
  it('сначала «загрузка», потом готовые курсы', async () => {
    mockFetch(THREE_DAYS);
    const { result } = renderHook(() => useRates());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({ status: 'ready', stale: false });
  });

  it('переходит в «ошибка», если курсов нет нигде', async () => {
    mockFetch({});
    const { result } = renderHook(() => useRates());

    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('отменяет запросы, когда пользователь уходит со страницы', () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.signal) signals.push(init.signal);
        return new Promise(() => {}); // ответа так и не будет
      }),
    );

    const { unmount } = renderHook(() => useRates());
    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    unmount();
    expect(signals[0]?.aborted).toBe(true);
  });
});
