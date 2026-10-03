import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { parseNumber, plainNumber } from '../lib/format';
import { clamp } from '../lib/state';

// ---- NumberField ------------------------------------------------------------

interface SliderConfig {
  min: number;
  max: number;
  /** `sqrt` gives fine control at the low end of wide money ranges. */
  scale?: 'linear' | 'sqrt';
  step?: number;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Arrow-key increment. */
  step?: number;
  prefix?: string;
  suffix?: string;
  slider?: SliderConfig;
  hint?: ReactNode;
  /** Extra control rendered on the same row as the input (e.g. a frequency select). */
  aside?: ReactNode;
  compact?: boolean;
}

const SLIDER_RES = 1000;

/** Rounds money-like values to a step that scales with magnitude. */
function niceRound(v: number): number {
  const step = v < 100 ? 1 : v < 1_000 ? 10 : v < 10_000 ? 50 : v < 100_000 ? 500 : v < 1_000_000 ? 1_000 : 10_000;
  return Math.round(v / step) * step;
}

function toSlider(v: number, s: SliderConfig): number {
  const frac = clamp((v - s.min) / (s.max - s.min), 0, 1);
  return Math.round((s.scale === 'sqrt' ? Math.sqrt(frac) : frac) * SLIDER_RES);
}

function fromSlider(pos: number, s: SliderConfig): number {
  const frac = pos / SLIDER_RES;
  if (s.scale === 'sqrt') return niceRound(s.min + frac * frac * (s.max - s.min));
  const raw = s.min + frac * (s.max - s.min);
  const step = s.step ?? 1;
  return Number((Math.round(raw / step) * step).toFixed(6));
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  slider,
  hint,
  aside,
  compact,
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const commit = (v: number) => onChange(clamp(v, min, max));

  const sliderPos = slider ? toSlider(value, slider) : 0;

  return (
    <div className={`field${compact ? ' field--compact' : ''}`}>
      <div className="field__head">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        {hint && <span className="field__hint">{hint}</span>}
      </div>
      <div className="field__row">
        <div className={`field__box${invalid ? ' field__box--invalid' : ''}`}>
          {prefix && <span className="field__affix">{prefix}</span>}
          <input
            id={id}
            className="field__input"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft ?? plainNumber(value)}
            onFocus={(e) => {
              setDraft(plainNumber(value).replace(/,/g, ''));
              requestAnimationFrame(() => e.target.select());
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              const parsed = parseNumber(e.target.value);
              setInvalid(parsed === null && e.target.value.trim() !== '');
              if (parsed !== null) commit(parsed);
            }}
            onBlur={() => {
              setDraft(null);
              setInvalid(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const mult = e.shiftKey ? 10 : 1;
                const next = clamp(value + (e.key === 'ArrowUp' ? step : -step) * mult, min, max);
                const rounded = Number(next.toFixed(6));
                commit(rounded);
                setDraft(String(rounded));
              } else if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {suffix && <span className="field__affix">{suffix}</span>}
        </div>
        {aside}
      </div>
      {slider && (
        <input
          type="range"
          className="slider"
          aria-label={`${label} slider`}
          min={0}
          max={SLIDER_RES}
          value={sliderPos}
          style={{ ['--fill' as string]: `${(sliderPos / SLIDER_RES) * 100}%` }}
          onChange={(e) => commit(fromSlider(Number(e.target.value), slider))}
        />
      )}
    </div>
  );
}

// ---- Segmented --------------------------------------------------------------

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean; title?: string }[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({ label, value, options, onChange, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          title={o.title}
          className={`segmented__opt${o.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- Select -----------------------------------------------------------------

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

export function Select<T extends string>({ label, value, options, onChange, hideLabel }: SelectProps<T>) {
  const id = useId();
  const select = (
    <div className="select">
      <select id={id} aria-label={hideLabel ? label : undefined} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="select__chevron" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
  if (hideLabel) return select;
  return (
    <div className="field">
      <div className="field__head">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
      </div>
      {select}
    </div>
  );
}

// ---- Misc -------------------------------------------------------------------

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function SeriesKey({ color, shape = 'line' }: { color: string; shape?: 'line' | 'rect' }) {
  return <span className={`key key--${shape}`} style={{ background: color }} aria-hidden="true" />;
}
