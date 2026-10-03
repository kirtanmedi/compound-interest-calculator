import { useState, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import { nearestIndex, niceTicks } from '../lib/chart';
import type { Snapshot, ValueMode } from '../lib/engine';
import { view } from '../lib/engine';
import { money, moneyCompact } from '../lib/format';
import { START_YEAR } from '../lib/labels';
import { SeriesKey, useElementWidth } from './controls';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  years: number;
  points: Snapshot[];
}

type Props =
  | { kind: 'breakdown'; mode: ValueMode; series: LineSeries }
  | { kind: 'compare'; mode: ValueMode; series: LineSeries[]; activeId: string };

const PLOT_HEIGHT = 280;
const M = { top: 12, bottom: 28, left: 56 };
const CONTRIB_COLOR = 'var(--series-1)';
const GAIN_COLOR = 'var(--series-3)';

const path = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

function yearLabel(t: number) {
  const whole = Math.floor(t + 1e-9);
  const months = Math.round((t - whole) * 12);
  if (months === 0 || months === 12) {
    const y = months === 12 ? whole + 1 : whole;
    return `Year ${y} · ${START_YEAR + y}`;
  }
  return `Year ${whole}, month ${months}`;
}

export function GrowthChart(props: Props) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const narrow = width < 520;
  const right = narrow ? 12 : 76;
  const plotW = Math.max(0, width - M.left - right);
  const H = M.top + PLOT_HEIGHT + M.bottom;

  const all = props.kind === 'breakdown' ? [props.series] : props.series;
  const maxYears = Math.max(...all.map((s) => s.years));
  // Hover snaps to the longest series' sample grid.
  const grid = all.reduce((a, b) => (b.years > a.years ? b : a)).points;

  let hi = 0;
  let lo = 0;
  for (const s of all) {
    for (const p of s.points) {
      const v = view(p, props.mode);
      hi = Math.max(hi, v.balance, v.contributed);
      lo = Math.min(lo, v.balance);
    }
  }
  const yTicks = niceTicks(lo, hi || 1, 5);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];

  const xTicks = niceTicks(0, maxYears, narrow ? 4 : 6).filter((t) => Number.isInteger(t) && t <= maxYears);
  const sx = (t: number) => M.left + (t / maxYears) * plotW;
  const sy = (v: number) => M.top + PLOT_HEIGHT - ((v - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

  const hoverT = hover === null ? null : grid[Math.min(hover, grid.length - 1)].t;

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * maxYears;
    setHover(nearestIndex(grid, t));
  };

  const onKey = (e: KeyboardEvent) => {
    const last = grid.length - 1;
    const cur = hover ?? -1;
    const jump = grid.length > 40 ? Math.round(grid.length / 30) : 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = Math.min(last, cur + (e.shiftKey ? jump * 5 : jump));
    else if (e.key === 'ArrowLeft') next = Math.max(0, (cur < 0 ? last : cur) - (e.shiftKey ? jump * 5 : jump));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else if (e.key === 'Escape') {
      setHover(null);
      return;
    } else return;
    e.preventDefault();
    setHover(next);
  };

  // ---- marks ----
  let marks: ReactElement;
  let endLabels: { y: number; x: number; text: string }[] = [];
  let tooltipRows: { key: string; color?: string; shape?: 'line' | 'rect'; label: string; value: string; strong?: boolean }[] = [];

  if (props.kind === 'breakdown') {
    const pts = props.series.points.map((p) => ({ t: p.t, ...view(p, props.mode) }));
    const top = pts.map((p) => [sx(p.t), sy(p.balance)] as [number, number]);
    const mid = pts.map((p) => [sx(p.t), sy(p.contributed)] as [number, number]);
    const base = pts.map((p) => [sx(p.t), sy(0)] as [number, number]);
    marks = (
      <g>
        <path d={path([...mid, ...base.reverse()]) + 'Z'} fill={CONTRIB_COLOR} opacity={0.16} />
        <path d={path([...top, ...[...mid].reverse()]) + 'Z'} fill={GAIN_COLOR} opacity={0.16} />
        <path d={path(mid)} className="line" stroke={CONTRIB_COLOR} />
        <path d={path(top)} className="line" stroke={GAIN_COLOR} />
      </g>
    );
    const last = pts[pts.length - 1];
    endLabels = [
      { x: sx(last.t), y: sy(last.balance), text: moneyCompact(last.balance) },
      { x: sx(last.t), y: sy(last.contributed), text: moneyCompact(last.contributed) },
    ];
    if (hoverT !== null) {
      const p = pts[nearestIndex(props.series.points, hoverT)];
      tooltipRows = [
        { key: 'bal', label: 'Balance', value: money(p.balance), strong: true },
        { key: 'gain', color: GAIN_COLOR, shape: 'line', label: props.mode === 'real' ? 'Real gain' : 'Interest', value: money(p.gain) },
        { key: 'contrib', color: CONTRIB_COLOR, shape: 'line', label: 'Contributions', value: money(p.contributed) },
      ];
    }
  } else {
    // Draw the active scenario last so it sits on top.
    const ordered = [
      ...props.series.filter((s) => s.id !== props.activeId),
      ...props.series.filter((s) => s.id === props.activeId),
    ];
    marks = (
      <g>
        {ordered.map((s) => (
          <path
            key={s.id}
            d={path(s.points.map((p) => [sx(p.t), sy(view(p, props.mode).balance)]))}
            className={`line${s.id === props.activeId ? '' : ' line--dim'}`}
            stroke={s.color}
          />
        ))}
      </g>
    );
    endLabels = props.series.map((s) => {
      const last = s.points[s.points.length - 1];
      const v = view(last, props.mode).balance;
      return { x: sx(last.t), y: sy(v), text: moneyCompact(v) };
    });
    if (hoverT !== null) {
      tooltipRows = props.series.map((s) => {
        const inRange = hoverT <= s.years + 1e-9;
        const p = s.points[nearestIndex(s.points, hoverT)];
        return {
          key: s.id,
          color: s.color,
          shape: 'line' as const,
          label: s.label,
          value: inRange ? money(view(p, props.mode).balance) : '—',
          strong: true,
        };
      });
    }
  }

  // Direct labels only when they won't collide (otherwise the legend + tooltip carry identity).
  const labelsFit =
    !narrow &&
    endLabels.every((a, i) =>
      endLabels.every((b, j) => i === j || Math.abs(a.x - b.x) > 64 || Math.abs(a.y - b.y) >= 16),
    );

  // Hover dots on every series at the crosshair.
  const hoverDots: { x: number; y: number; color: string }[] = [];
  if (hoverT !== null) {
    if (props.kind === 'breakdown') {
      const p = view(props.series.points[nearestIndex(props.series.points, hoverT)], props.mode);
      hoverDots.push({ x: sx(hoverT), y: sy(p.contributed), color: CONTRIB_COLOR });
      hoverDots.push({ x: sx(hoverT), y: sy(p.balance), color: GAIN_COLOR });
    } else {
      for (const s of props.series) {
        if (hoverT > s.years + 1e-9) continue;
        const p = s.points[nearestIndex(s.points, hoverT)];
        hoverDots.push({ x: sx(p.t), y: sy(view(p, props.mode).balance), color: s.color });
      }
    }
  }

  const hx = hoverT === null ? 0 : sx(hoverT);
  const flip = hx > M.left + plotW * 0.6;

  const legend =
    props.kind === 'breakdown'
      ? [
          { id: 'c', label: 'Contributions', color: CONTRIB_COLOR, shape: 'rect' as const },
          { id: 'g', label: props.mode === 'real' ? 'Real gain' : 'Interest', color: GAIN_COLOR, shape: 'rect' as const },
        ]
      : props.series.map((s) => ({ id: s.id, label: s.label, color: s.color, shape: 'line' as const }));

  const summary =
    props.kind === 'breakdown'
      ? `Balance over ${maxYears} years, split into contributions and ${props.mode === 'real' ? 'real gain' : 'interest'}.`
      : `Balance over time for ${props.series.map((s) => s.label).join(', ')}.`;

  return (
    <div className="chart">
      <ul className="legend" aria-label="Legend">
        {legend.map((l) => (
          <li key={l.id}>
            <SeriesKey color={l.color} shape={l.shape} />
            {l.label}
          </li>
        ))}
      </ul>

      <div
        ref={wrapRef}
        className="chart__frame"
        style={{ height: H }}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use arrow keys to inspect values.`}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={summary}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={M.left + plotW} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'axis' : 'grid'} />
                <text x={M.left - 10} y={sy(v)} className="tick" textAnchor="end" dominantBaseline="middle">
                  {moneyCompact(v)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={sx(t)} y={M.top + PLOT_HEIGHT + 18} className="tick" textAnchor="middle">
                {t === 0 ? 'Now' : `${t}y`}
              </text>
            ))}

            {marks}

            {labelsFit &&
              endLabels.map((l, i) => (
                <text key={i} x={l.x + 8} y={l.y} className="end-label" dominantBaseline="middle">
                  {l.text}
                </text>
              ))}

            {hoverT !== null && (
              <g pointerEvents="none">
                <line x1={hx} x2={hx} y1={M.top} y2={M.top + PLOT_HEIGHT} className="crosshair" />
                {hoverDots.map((d, i) => (
                  <circle key={i} cx={d.x} cy={d.y} r={4.5} fill={d.color} className="dot" />
                ))}
              </g>
            )}

            <rect
              x={M.left}
              y={0}
              width={plotW}
              height={H}
              fill="transparent"
              onPointerMove={onPointer}
              onPointerDown={onPointer}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
              style={{ touchAction: 'pan-y' }}
            />
          </svg>
        )}

        {hoverT !== null && (
          <div
            className="tooltip"
            style={{
              top: M.top,
              ...(flip ? { right: width - hx + 12 } : { left: hx + 12 }),
            }}
          >
            <div className="tooltip__head">{yearLabel(hoverT)}</div>
            {tooltipRows.map((r) => (
              <div key={r.key} className="tooltip__row">
                {r.color ? <SeriesKey color={r.color} shape="line" /> : <span className="key key--none" />}
                <span className={`tooltip__value${r.strong ? ' is-strong' : ''}`}>{r.value}</span>
                <span className="tooltip__label">{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
