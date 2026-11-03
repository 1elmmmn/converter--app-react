import { useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useElementWidth } from '../hooks/useElementWidth';
import { formatNumber, pairRate, percentChange } from '../lib/converter';
import { plural, shortDate } from '../lib/format';
import type { RatesSnapshot } from '../types';

interface Props {
  days: RatesSnapshot[]; // от новых к старым
  from: string;
  to: string;
  loading: boolean;
  hasHistory: boolean; // у источника вообще есть история (только ЦБ РФ)
}

const H = 160;
const PAD_X = 8;
const PAD_TOP = 18;
const PAD_BOTTOM = 24;

function formatChange(change: number): string {
  return (change >= 0 ? '+' : '−') + Math.abs(change).toFixed(2).replace('.', ',') + '%';
}

/** График курса за последние дни: чистый SVG без библиотек, значение на любую дату при наведении. */
export function RateChart({ days, from, to, loading, hasHistory }: Props) {
  const [chartRef, measured] = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(
    () =>
      days
        .filter((d) => d.rates[from] && d.rates[to])
        .map((d) => ({ date: d.date, value: pairRate(from, to, d.rates) }))
        .reverse(),
    [days, from, to],
  );

  const first = points[0];
  const last = points[points.length - 1];
  const hasChart = first !== undefined && last !== undefined && points.length >= 2;

  // Ширина viewBox равна реальной ширине блока, поэтому подписи не масштабируются.
  const W = Math.max(260, measured || 420);
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= min * 0.01 || 1;
    max += max * 0.01 || 1;
  }
  const x = (i: number) => PAD_X + (i * (W - PAD_X * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => PAD_TOP + ((max - v) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM);

  const onMove = (event: PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD_X) / (W - PAD_X * 2)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  if (!hasChart) {
    let message = 'Недостаточно данных для графика';
    if (loading) message = 'Загружаем историю…';
    else if (!hasHistory) message = 'История доступна только для курсов ЦБ РФ';
    return (
      <section className="block" aria-labelledby="chart-title">
        <div className="row">
          <h2 id="chart-title">Динамика курса</h2>
        </div>
        <p className="muted">Последние 14 дней</p>
        <div ref={chartRef} className="chart" role="img" aria-label="График курса за последние дни">
          <p className="chart-empty">{message}</p>
        </div>
        <p className="readout" />
      </section>
    );
  }

  const shown = hover ?? points.length - 1; // без наведения показываем последнее значение
  const point = points[shown] ?? last;
  const change = percentChange(last.value, first.value);

  const line = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H - PAD_BOTTOM} L${x(0).toFixed(1)} ${H - PAD_BOTTOM} Z`;
  const label =
    `График курса ${from} к ${to} с ${shortDate(first.date)} по ${shortDate(last.date)}: ` +
    `от ${formatNumber(first.value)} до ${formatNumber(last.value)}`;
  const caption = `${from} → ${to}, за ${points.length} ${plural(points.length, ['день', 'дня', 'дней'])} (рабочие дни ЦБ)`;
  const cursorOpacity = hover === null ? 0 : 1;

  return (
    <section className="block" aria-labelledby="chart-title">
      <div className="row">
        <h2 id="chart-title">Динамика курса</h2>
        <span className={'delta ' + (change >= 0 ? 'up' : 'down')}>{formatChange(change)}</span>
      </div>
      <p className="muted">{caption}</p>
      <div
        ref={chartRef}
        className="chart"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--chart)', stopOpacity: 0.28 }} />
              <stop offset="1" style={{ stopColor: 'var(--chart)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={area} className="area" />
          <path d={line} className="line" />
          <circle cx={x(points.length - 1)} cy={y(last.value)} r={4.5} className="dot" />
          <line x1={x(shown)} x2={x(shown)} y1={PAD_TOP - 4} y2={H - PAD_BOTTOM} className="cursor" style={{ opacity: cursorOpacity }} />
          <circle cx={x(shown)} cy={y(point.value)} r={5} className="cursor-dot" style={{ opacity: cursorOpacity }} />
          <text x={PAD_X} y={H - 4} className="lbl">{shortDate(first.date)}</text>
          <text x={W - PAD_X} y={H - 4} className="lbl" textAnchor="end">{shortDate(last.date)}</text>
          <text x={PAD_X} y={10} className="lbl">макс {formatNumber(Math.max(...values))}</text>
          <text x={W - PAD_X} y={10} className="lbl" textAnchor="end">мин {formatNumber(Math.min(...values))}</text>
        </svg>
      </div>
      <p className="readout">
        {shortDate(point.date)}: {formatNumber(point.value)} {to}
      </p>
    </section>
  );
}
