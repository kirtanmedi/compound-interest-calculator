import {
  DEFAULT_SCENARIO,
  LIMITS,
  type Compounding,
  type ContributionFrequency,
  type ScenarioInputs,
  type Timing,
  type ValueMode,
} from './engine';
import type { SolveFor } from './solver';

/** Stable scenario identity: drives the label, the color and the URL key suffix. */
export type Slot = 'a' | 'b' | 'c';
export const SLOTS: Slot[] = ['a', 'b', 'c'];

export interface Scenario extends ScenarioInputs {
  slot: Slot;
}

export type ChartView = 'breakdown' | 'compare';

export interface AppState {
  scenarios: Scenario[];
  active: Slot;
  inflation: number;
  mode: ValueMode;
  chart: ChartView;
  goal: { target: number; solveFor: SolveFor };
}

export const DEFAULT_STATE: AppState = {
  scenarios: [{ ...DEFAULT_SCENARIO, slot: 'a' }],
  active: 'a',
  inflation: 0,
  mode: 'real',
  chart: 'breakdown',
  goal: { target: 1_000_000, solveFor: 'contribution' },
};

// ---- URL encoding ---------------------------------------------------------
//
// Scenario A uses bare keys (?p=10000&c=500); B and C add a suffix (?p_b=…).
// Values equal to the defaults are omitted so shared links stay short.

const SCENARIO_KEYS: Record<keyof ScenarioInputs, string> = {
  initial: 'p',
  contribution: 'c',
  contributionFrequency: 'f',
  contributionTiming: 't',
  contributionGrowth: 'g',
  rate: 'r',
  compounding: 'k',
  years: 'y',
};

const FREQ_CODES: Record<ContributionFrequency, string> = {
  weekly: 'w',
  biweekly: 'bw',
  monthly: 'm',
  quarterly: 'q',
  annually: 'y',
};

const COMPOUNDING_CODES: Record<Compounding, string> = {
  daily: 'd',
  monthly: 'm',
  quarterly: 'q',
  semiannually: 's',
  annually: 'y',
  continuously: 'c',
};

const TIMING_CODES: Record<Timing, string> = { start: 's', end: 'e' };

const SOLVE_CODES: Record<SolveFor, string> = {
  contribution: 'c',
  initial: 'p',
  rate: 'r',
  years: 'y',
};

const invert = <T extends string>(m: Record<T, string>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, T>;

const FREQ_FROM = invert(FREQ_CODES);
const COMPOUNDING_FROM = invert(COMPOUNDING_CODES);
const TIMING_FROM = invert(TIMING_CODES);
const SOLVE_FROM = invert(SOLVE_CODES);

const suffix = (slot: Slot) => (slot === 'a' ? '' : `_${slot}`);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function num(params: URLSearchParams, key: string, fallback: number, lo: number, hi: number) {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
}

function encodeScenario(s: Scenario, params: URLSearchParams) {
  const sfx = suffix(s.slot);
  const d = DEFAULT_SCENARIO;
  const k = SCENARIO_KEYS;
  const put = (key: string, value: string, isDefault: boolean) => {
    if (!isDefault) params.set(key + sfx, value);
  };
  put(k.initial, String(s.initial), s.initial === d.initial);
  put(k.contribution, String(s.contribution), s.contribution === d.contribution);
  put(k.contributionFrequency, FREQ_CODES[s.contributionFrequency], s.contributionFrequency === d.contributionFrequency);
  put(k.contributionTiming, TIMING_CODES[s.contributionTiming], s.contributionTiming === d.contributionTiming);
  put(k.contributionGrowth, String(s.contributionGrowth), s.contributionGrowth === d.contributionGrowth);
  put(k.rate, String(s.rate), s.rate === d.rate);
  put(k.compounding, COMPOUNDING_CODES[s.compounding], s.compounding === d.compounding);
  put(k.years, String(s.years), s.years === d.years);
}

function decodeScenario(slot: Slot, params: URLSearchParams): Scenario {
  const sfx = suffix(slot);
  const d = DEFAULT_SCENARIO;
  const k = SCENARIO_KEYS;
  const get = (key: string) => params.get(key + sfx);
  const money = (key: string, fallback: number) =>
    num(params, key + sfx, fallback, LIMITS.money.min, LIMITS.money.max);
  return {
    slot,
    initial: money(k.initial, d.initial),
    contribution: money(k.contribution, d.contribution),
    contributionFrequency: FREQ_FROM[get(k.contributionFrequency) ?? ''] ?? d.contributionFrequency,
    contributionTiming: TIMING_FROM[get(k.contributionTiming) ?? ''] ?? d.contributionTiming,
    contributionGrowth: num(params, k.contributionGrowth + sfx, d.contributionGrowth, LIMITS.growth.min, LIMITS.growth.max),
    rate: num(params, k.rate + sfx, d.rate, LIMITS.rate.min, LIMITS.rate.max),
    compounding: COMPOUNDING_FROM[get(k.compounding) ?? ''] ?? d.compounding,
    years: Math.round(num(params, k.years + sfx, d.years, LIMITS.years.min, LIMITS.years.max)),
  };
}

export function encodeState(state: AppState): string {
  const params = new URLSearchParams();
  const slots = state.scenarios.map((s) => s.slot).join('');
  if (slots !== 'a') params.set('sc', slots);
  if (state.active !== state.scenarios[0].slot) params.set('a', state.active);
  for (const s of state.scenarios) encodeScenario(s, params);
  if (state.inflation !== DEFAULT_STATE.inflation) params.set('inf', String(state.inflation));
  if (state.mode !== DEFAULT_STATE.mode) params.set('real', state.mode === 'real' ? '1' : '0');
  if (state.chart === 'compare') params.set('view', 'compare');
  if (state.goal.target !== DEFAULT_STATE.goal.target) params.set('goal', String(state.goal.target));
  if (state.goal.solveFor !== DEFAULT_STATE.goal.solveFor) params.set('solve', SOLVE_CODES[state.goal.solveFor]);
  return params.toString();
}

export function decodeState(search: string): AppState {
  const params = new URLSearchParams(search);
  const requested = (params.get('sc') ?? 'a').toLowerCase();
  const slots = SLOTS.filter((s) => requested.includes(s));
  if (slots.length === 0) slots.push('a');

  const scenarios = slots.map((slot) => decodeScenario(slot, params));
  const activeParam = params.get('a') as Slot | null;
  const active = activeParam && slots.includes(activeParam) ? activeParam : slots[0];

  return {
    scenarios,
    active,
    inflation: num(params, 'inf', DEFAULT_STATE.inflation, LIMITS.inflation.min, LIMITS.inflation.max),
    mode: params.get('real') === '1' ? 'real' : params.get('real') === '0' ? 'nominal' : DEFAULT_STATE.mode,
    chart: params.get('view') === 'compare' && scenarios.length > 1 ? 'compare' : 'breakdown',
    goal: {
      target: num(params, 'goal', DEFAULT_STATE.goal.target, 1, LIMITS.money.max),
      solveFor: SOLVE_FROM[params.get('solve') ?? ''] ?? DEFAULT_STATE.goal.solveFor,
    },
  };
}
