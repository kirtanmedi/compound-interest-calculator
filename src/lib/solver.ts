import { LIMITS, simulate, type ScenarioInputs, type ValueMode, view } from './engine';

export type SolveFor = 'contribution' | 'initial' | 'rate' | 'years';

export type SolveResult =
  | { status: 'ok'; value: number }
  /** The target is already met with this variable at its minimum (0, or year 0). */
  | { status: 'already'; value: number }
  | { status: 'unreachable' };

export interface SolveOptions {
  inflation: number;
  mode: ValueMode;
}

function finalValue(inputs: ScenarioInputs, opts: SolveOptions): number {
  return view(simulate(inputs, { inflation: opts.inflation }).final, opts.mode).balance;
}

/** Final balance is affine in `key`, so two evaluations pin down the exact answer. */
function solveLinear(
  inputs: ScenarioInputs,
  key: 'contribution' | 'initial',
  target: number,
  opts: SolveOptions,
): SolveResult {
  const at0 = finalValue({ ...inputs, [key]: 0 }, opts);
  if (at0 >= target) return { status: 'already', value: 0 };
  const at1 = finalValue({ ...inputs, [key]: 1 }, opts);
  const slope = at1 - at0;
  if (!(slope > 0)) return { status: 'unreachable' };
  const value = (target - at0) / slope;
  return value > LIMITS.money.max ? { status: 'unreachable' } : { status: 'ok', value };
}

/** Final balance is monotonic in the rate when deposits are non-negative, so bisection works. */
function solveRate(inputs: ScenarioInputs, target: number, opts: SolveOptions): SolveResult {
  let lo: number = LIMITS.rate.min;
  let hi: number = LIMITS.rate.max;
  if (finalValue({ ...inputs, rate: hi }, opts) < target) return { status: 'unreachable' };
  if (finalValue({ ...inputs, rate: lo }, opts) >= target) return { status: 'already', value: lo };
  for (let i = 0; i < 60 && hi - lo > 1e-7; i++) {
    const mid = (lo + hi) / 2;
    if (finalValue({ ...inputs, rate: mid }, opts) >= target) hi = mid;
    else lo = mid;
  }
  return { status: 'ok', value: hi };
}

/** Walks the period-by-period path out to the max horizon and returns the first crossing. */
function solveYears(inputs: ScenarioInputs, target: number, opts: SolveOptions): SolveResult {
  const { points } = simulate(inputs, { inflation: opts.inflation, years: LIMITS.years.max });
  if (view(points[0], opts.mode).balance >= target) return { status: 'already', value: 0 };
  const hit = points.find((p) => view(p, opts.mode).balance >= target);
  return hit ? { status: 'ok', value: hit.t } : { status: 'unreachable' };
}

export function solve(
  inputs: ScenarioInputs,
  solveFor: SolveFor,
  target: number,
  opts: SolveOptions,
): SolveResult {
  switch (solveFor) {
    case 'contribution':
    case 'initial':
      return solveLinear(inputs, solveFor, target, opts);
    case 'rate':
      return solveRate(inputs, target, opts);
    case 'years':
      return solveYears(inputs, target, opts);
  }
}
