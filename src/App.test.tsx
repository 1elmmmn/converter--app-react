import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { ER_API, FALLBACK_URL, mockFetch, THREE_DAYS } from './test/fixtures';

const result = () => document.getElementById('result')?.textContent;
const rate = () => document.getElementById('rate')?.textContent;
const amountInput = () => screen.getByLabelText('У меня есть');

/** Рендерит приложение и ждёт, пока загрузятся курсы. */
async function renderLoaded() {
  render(<App />);
  await screen.findByText(/Источник:/);
}

describe('App', () => {
  it('показывает конвертацию по курсам ЦБ РФ', async () => {
    mockFetch(THREE_DAYS);
    render(<App />);

    expect(await screen.findByText('Источник: ЦБ РФ, курс на 10 октября 2026.')).toBeInTheDocument();
    expect(amountInput()).toHaveValue('100');
    expect(result()).toMatch(/^8\s000,00$/);
    expect(document.getElementById('result-from')?.textContent).toBe('100,00 USD =');
    expect(rate()).toContain('1 USD = 80,00 RUB');
    expect(rate()).toContain('1 RUB = 0,0125 USD');
  });

  it('пересчитывает при вводе суммы в разных форматах и меняет валюты местами', async () => {
    mockFetch(THREE_DAYS);
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(amountInput());
    await user.type(amountInput(), '1 000,50');
    expect(result()).toMatch(/^80\s040,00$/);

    await user.click(screen.getByRole('button', { name: 'Поменять валюты местами' }));
    expect(screen.getByLabelText('Исходная валюта')).toHaveValue('RUB');
    expect(screen.getByLabelText('Целевая валюта')).toHaveValue('USD');
    expect(result()).toBe('12,51');
  });

  it('показывает понятную ошибку при неверной сумме и подсказывает при пустой', async () => {
    mockFetch(THREE_DAYS);
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(amountInput());
    expect(screen.getByRole('alert')).toHaveTextContent('Введите сумму');

    await user.type(amountInput(), 'abc');
    expect(screen.getByRole('alert')).toHaveTextContent('Введите число, например 1 000,50');
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true');
    expect(result()).toBe('—');

    await user.clear(amountInput());
    await user.type(amountInput(), '5');
    expect(screen.getByRole('alert', { hidden: true })).not.toBeVisible();
    expect(amountInput()).not.toHaveAttribute('aria-invalid');
  });

  it('быстрые пары переключают валюты', async () => {
    mockFetch(THREE_DAYS);
    const user = userEvent.setup();
    await renderLoaded();

    const chip = screen.getByRole('button', { name: 'EUR → RUB' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Исходная валюта')).toHaveValue('EUR');
    expect(rate()).toContain('1 EUR = 90,00 RUB');
    expect(JSON.parse(localStorage.getItem('currency-converter:pair') ?? '{}')).toEqual({ from: 'EUR', to: 'RUB' });
  });

  it('учитывает номинал: 100 иен — это 55 рублей', async () => {
    mockFetch(THREE_DAYS);
    const user = userEvent.setup();
    await renderLoaded();

    await user.selectOptions(screen.getByLabelText('Исходная валюта'), 'JPY');
    await user.clear(amountInput());
    await user.type(amountInput(), '100');
    expect(result()).toBe('55,00');
  });

  it('рисует график за три дня и считает изменение курса', async () => {
    mockFetch(THREE_DAYS);
    await renderLoaded();

    expect(await screen.findByText('+2,56%')).toBeInTheDocument();
    expect(screen.getByText('USD → RUB, за 3 дня (рабочие дни ЦБ)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /График курса USD к RUB с 8 окт\. по 10 окт\./ })).toBeInTheDocument();
    expect(screen.getByText(/10 окт\.: 80,00 RUB/)).toBeInTheDocument();
  });

  it('сохраняет конвертацию в историю после паузы и повторяет её по клику', async () => {
    mockFetch(THREE_DAYS);
    const user = userEvent.setup();
    await renderLoaded();

    const entry = await screen.findByRole('button', { name: 'Повторить: 100,00 USD в RUB' }, { timeout: 4000 });
    expect(JSON.parse(localStorage.getItem('currency-converter:history') ?? '[]')).toEqual([
      { amount: 100, from: 'USD', to: 'RUB', value: 8000 },
    ]);

    await user.clear(amountInput());
    await user.type(amountInput(), '7');
    await user.click(entry);
    expect(amountInput()).toHaveValue('100');

    await user.click(screen.getByRole('button', { name: 'Очистить' }));
    expect(screen.getByText(/последние конвертации появятся здесь/)).toBeInTheDocument();
  });

  it('использует запасной источник и честно говорит, что истории курса нет', async () => {
    mockFetch({ [FALLBACK_URL]: ER_API });
    render(<App />);

    expect(await screen.findByText('Источник: open.er-api.com, курс на 10 октября 2026.')).toBeInTheDocument();
    expect(rate()).toContain('1 USD = 80,00 RUB');
    expect(screen.getByText('История доступна только для курсов ЦБ РФ')).toBeInTheDocument();
  });

  it('без сети показывает сохранённые курсы', async () => {
    localStorage.setItem(
      'currency-converter:rates',
      JSON.stringify({
        source: 'ЦБ РФ',
        date: '2026-10-09',
        previousUrl: null,
        rates: {
          RUB: { code: 'RUB', name: 'Российский рубль', rub: 1, prevRub: 1 },
          USD: { code: 'USD', name: 'Доллар США', rub: 79, prevRub: 79 },
        },
      }),
    );
    mockFetch({});
    render(<App />);

    expect(await screen.findByText('Нет соединения: показаны сохранённые курсы на 9 октября 2026.')).toBeInTheDocument();
    expect(result()).toMatch(/^7\s900,00$/);
  });

  it('сообщает об ошибке, если курсов нет совсем', async () => {
    mockFetch({});
    render(<App />);

    expect(await screen.findByText(/Не удалось загрузить курсы/)).toBeInTheDocument();
    expect(result()).toBe('—');
  });

  it('переключает тему и запоминает выбор', async () => {
    mockFetch(THREE_DAYS);
    const user = userEvent.setup();
    await renderLoaded();

    expect(document.documentElement.dataset.theme).toBe('dark'); // системная тема из заглушки
    await user.click(screen.getByRole('button', { name: 'Переключить тему оформления' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('currency-converter:theme')).toBe('"light"');
  });
});
