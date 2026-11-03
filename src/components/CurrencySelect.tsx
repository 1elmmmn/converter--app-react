import { useMemo } from 'react';
import { sortCodes } from '../lib/converter';
import type { Rate } from '../types';

export const POPULAR = ['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'TRY', 'KZT', 'AED', 'JPY', 'CHF'];

interface Props {
  id: string;
  label: string;
  value: string;
  rates: Record<string, Rate>;
  onChange: (code: string) => void;
}

/** Выбор валюты: популярные сверху, остальные по алфавиту. */
export function CurrencySelect({ id, label, value, rates, onChange }: Props) {
  const { popular, rest } = useMemo(() => sortCodes(Object.keys(rates), POPULAR), [rates]);

  const options = (codes: string[]) =>
    codes.map((code) => (
      <option key={code} value={code}>
        {code} {rates[code]?.name}
      </option>
    ));

  return (
    <div className="select">
      <select id={id} name={id} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <optgroup label="Популярные">{options(popular)}</optgroup>
        <optgroup label="Все валюты">{options(rest)}</optgroup>
      </select>
    </div>
  );
}
