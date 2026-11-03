/** "2026-10-10" -> "10 октября 2026". Пустая строка, если даты нет. */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '');
}

/** "2026-10-10" -> "10 окт." */
export function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Склонение: plural(2, ['день', 'дня', 'дней']) -> 'дня'. */
export function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}
