import { useEffect, useState } from 'react';
import { ConversionHistory } from './components/ConversionHistory';
import { CurrencySelect } from './components/CurrencySelect';
import { Header } from './components/Header';
import { QuickPairs } from './components/QuickPairs';
import { RateChart } from './components/RateChart';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useRateHistory } from './hooks/useRateHistory';
import { useRates } from './hooks/useRates';
import { useTheme } from './hooks/useTheme';
import { convert, formatNumber, pairRate, parseAmount } from './lib/converter';
import { formatDate } from './lib/format';
import { DEFAULT_PAIR, HISTORY_LIMIT, parseHistory, parsePair } from './lib/parse';
import type { HistoryItem, Pair } from './types';

/** Пауза после последнего изменения, после которой конвертация попадает в историю. */
const HISTORY_SAVE_DELAY = 1500;

export default function App() {
  const { toggleTheme } = useTheme();
  const rates = useRates();
  const data = rates.status === 'ready' ? rates.data : null;
  const stale = rates.status === 'ready' && rates.stale;
  const chart = useRateHistory(data, !stale);

  const [amountText, setAmountText] = useState('100');
  const [savedPair, setPair] = useLocalStorage<Pair>('pair', parsePair);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('history', parseHistory);
  const [spun, setSpun] = useState(false);

  // Сохранённая пара могла устареть (валюты нет в свежих курсах): тогда берём пару по умолчанию.
  const from = data?.rates[savedPair.from] ? savedPair.from : DEFAULT_PAIR.from;
  const to = data?.rates[savedPair.to] ? savedPair.to : DEFAULT_PAIR.to;
  const pair: Pair = { from, to };

  const amount = parseAmount(amountText);
  const value =
    data && data.rates[from] && data.rates[to] && !Number.isNaN(amount) ? convert(amount, from, to, data.rates) : null;

  let amountError: string | null = null;
  if (data && Number.isNaN(amount)) {
    amountError = amountText.trim() === '' ? 'Введите сумму' : 'Введите число, например 1 000,50';
  }

  // Конвертация попадает в историю, когда пользователь перестал менять сумму и пару.
  useEffect(() => {
    if (value === null) return;
    const timer = window.setTimeout(() => {
      setHistory((list) => {
        const top = list[0];
        if (top && top.amount === amount && top.from === from && top.to === to) return list;
        return [{ amount, from, to, value }, ...list].slice(0, HISTORY_LIMIT);
      });
    }, HISTORY_SAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [amount, from, to, value, setHistory]);

  const swap = () => {
    setPair({ from: to, to: from });
    setSpun((s) => !s);
  };

  const repeat = (item: HistoryItem) => {
    if (!data?.rates[item.from] || !data.rates[item.to]) return;
    setAmountText(String(item.amount).replace('.', ','));
    setPair({ from: item.from, to: item.to });
  };

  const date = data ? formatDate(data.date) : '';
  let status = 'Загружаем курсы…';
  let statusKind: 'warn' | undefined;
  if (rates.status === 'error') {
    status = 'Не удалось загрузить курсы. Проверьте соединение и обновите страницу.';
    statusKind = 'warn';
  } else if (data && stale) {
    status = 'Нет соединения: показаны сохранённые курсы' + (date ? ' на ' + date : '') + '.';
    statusKind = 'warn';
  } else if (data) {
    status = 'Источник: ' + data.source + (date ? ', курс на ' + date : '') + '.';
  }

  return (
    <>
      <Header onToggleTheme={toggleTheme} />

      <main className="page">
        <div className="intro">
          <h1 id="title">Конвертер валют</h1>
          <p className="lede">Официальные курсы Центрального банка РФ. Результат пересчитывается, пока вы печатаете.</p>
        </div>

        <div className="grid">
          <div className="col-main">
            <section className="note" aria-labelledby="title">
              <form className="note__form" noValidate autoComplete="off" onSubmit={(event) => event.preventDefault()}>
                <div className="side">
                  <label htmlFor="amount" className="side__label">
                    У меня есть
                  </label>
                  <div className="side__row">
                    <input
                      id="amount"
                      name="amount"
                      className="figure figure--input"
                      type="text"
                      inputMode="decimal"
                      placeholder="1 000,50"
                      value={amountText}
                      aria-describedby="amount-error"
                      aria-invalid={amountError ? true : undefined}
                      onChange={(event) => setAmountText(event.target.value)}
                    />
                    <CurrencySelect
                      id="from"
                      label="Исходная валюта"
                      value={from}
                      rates={data?.rates ?? {}}
                      onChange={(code) => setPair({ from: code, to })}
                    />
                  </div>
                  <p id="amount-error" className="error" role="alert" hidden={!amountError}>
                    {amountError}
                  </p>
                </div>

                <div className="thread">
                  <button
                    type="button"
                    className={spun ? 'swap spin' : 'swap'}
                    aria-label="Поменять валюты местами"
                    onClick={swap}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path
                        d="M8 4v15m0 0l-3.5-3.5M8 19l3.5-3.5M16 20V5m0 0l-3.5 3.5M16 5l3.5 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="side" aria-live="polite">
                  <p id="result-from" className="side__label">
                    {value === null ? ' ' : `${formatNumber(amount)} ${from} =`}
                  </p>
                  <div className="side__row">
                    <p id="result" className={rates.status === 'loading' ? 'figure skeleton' : 'figure'}>
                      {value === null ? '—' : formatNumber(value)}
                    </p>
                    <CurrencySelect
                      id="to"
                      label="Целевая валюта"
                      value={to}
                      rates={data?.rates ?? {}}
                      onChange={(code) => setPair({ from, to: code })}
                    />
                  </div>
                </div>
              </form>
              <p id="rate" className="note__rate">
                {data &&
                  data.rates[from] &&
                  data.rates[to] &&
                  `1 ${from} = ${formatNumber(pairRate(from, to, data.rates))} ${to}\n1 ${to} = ${formatNumber(pairRate(to, from, data.rates))} ${from}`}
              </p>
            </section>

            <QuickPairs rates={data?.rates ?? {}} current={pair} onPick={setPair} />
            <p className="status" role="status" data-kind={statusKind}>
              {status}
            </p>
          </div>

          <aside className="col-side">
            <RateChart
              days={chart.days}
              from={from}
              to={to}
              loading={rates.status === 'loading' || chart.loading}
              hasHistory={data ? Boolean(data.previousUrl) : true}
            />
            <ConversionHistory items={history} onPick={repeat} onClear={() => setHistory([])} />
          </aside>
        </div>
      </main>

      <footer className="foot">
        Данные:{' '}
        <a href="https://www.cbr-xml-daily.ru/" target="_blank" rel="noopener">
          cbr-xml-daily.ru
        </a>{' '}
        (ЦБ РФ), запасной источник:{' '}
        <a href="https://open.er-api.com/" target="_blank" rel="noopener">
          open.er-api.com
        </a>
        . Курсы носят справочный характер.
      </footer>
    </>
  );
}
