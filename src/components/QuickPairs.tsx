import type { Pair, Rate } from '../types';

const QUICK_PAIRS: Array<[string, string]> = [
  ['USD', 'RUB'],
  ['EUR', 'RUB'],
  ['CNY', 'RUB'],
  ['RUB', 'USD'],
  ['RUB', 'EUR'],
];

interface Props {
  rates: Record<string, Rate>;
  current: Pair;
  onPick: (pair: Pair) => void;
}

export function QuickPairs({ rates, current, onPick }: Props) {
  return (
    <div className="chips" role="group" aria-label="Популярные пары">
      {QUICK_PAIRS.filter(([a, b]) => rates[a] && rates[b]).map(([from, to]) => (
        <button
          key={from + to}
          type="button"
          className="chip"
          aria-pressed={current.from === from && current.to === to}
          onClick={() => onPick({ from, to })}
        >
          {from} → {to}
        </button>
      ))}
    </div>
  );
}
