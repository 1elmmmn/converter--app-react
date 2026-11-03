import { formatNumber } from '../lib/converter';
import type { HistoryItem } from '../types';

interface Props {
  items: HistoryItem[];
  onPick: (item: HistoryItem) => void;
  onClear: () => void;
}

export function ConversionHistory({ items, onPick, onClear }: Props) {
  return (
    <section className="block" aria-labelledby="history-title">
      <div className="row">
        <h2 id="history-title">История</h2>
        {items.length > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            Очистить
          </button>
        )}
      </div>
      {items.length === 0 && <p className="muted">Введите сумму, и последние конвертации появятся здесь.</p>}
      <ul className="history">
        {items.map((item) => {
          const left = `${formatNumber(item.amount)} ${item.from}`;
          return (
            <li key={`${item.amount}-${item.from}-${item.to}`}>
              <button type="button" aria-label={`Повторить: ${left} в ${item.to}`} onClick={() => onPick(item)}>
                <span>{left}</span>
                <span className="to">
                  → {formatNumber(item.value)} {item.to}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
