export type Compounding =
  | 'daily'
  | 'monthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually'
  | 'continuously';

export type ContributionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

export type Timing = 'start' | 'end';

export const COMPOUNDING_PER_YEAR: Record<Exclude<Compounding, 'continuously'>, number> = {
  daily: 365,
  monthly: 12,
  quarterly: 4,
  semiannually: 2,
  annually: 1,
};

export const CONTRIBUTIONS_PER_YEAR: Record<ContributionFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

export interface ScenarioInputs {
  /** Starting balance. */
  initial: number;
  /** Amount deposited each contribution period. */
  contribution: number;
  contributionFrequency: ContributionFrequency;
  /** Whether deposits land at the start or the end of each period. */
  contributionTiming: Timing;
  /** Yearly % raise applied to the contribution amount on each anniversary. */
  contributionGrowth: number;
  /** Nominal annual interest rate, in %. */
  rate: number;
  compounding: Compounding;
  years: number;
}

export interface Snapshot {
  /** Time in years since the start. */
  t: number;
  balance: number;
  /** Cumulative deposits, including the initial balance. */
  contributed: number;
  /** Balance in start-of-horizon dollars. */
  realBalance: number;
  /** Each deposit deflated to start-of-horizon dollars at the moment it was made. */
  realContributed: number;
}

export interface YearRow {
  year: number;
  startBalance: number;
  contributions: number;
  interest: number;
  endBalance: number;
  totalContributed: number;
  totalInterest: number;
  realEndBalance: number;
}

export interface SimulationResult {
  /** One snapshot at t=0, then one per contribution period. */
  points: Snapshot[];
  years: YearRow[];
  final: Snapshot;
  effectiveAnnualRate: number;
}

export interface SimulateOptions {
  /** Annual inflation, in %, used for the real (today's dollars) figures. */
  inflation?: number;
  /** Override the horizon (used by the goal solver to look past `inputs.years`). */
  years?: number;
}

export const DEFAULT_SCENARIO: ScenarioInputs = {
  initial: 10_000,
  contribution: 500,
  contributionFrequency: 'monthly',
  contributionTiming: 'end',
  contributionGrowth: 0,
  rate: 7,
  compounding: 'monthly',
  years: 30,
};

export const LIMITS = {
  money: { min: 0, max: 1_000_000_000 },
  rate: { min: -50, max: 100 },
  growth: { min: -50, max: 100 },
  inflation: { min: -10, max: 50 },
  years: { min: 1, max: 100 },
} as const;

/** Annual yield actually earned once compounding is applied, as a fraction (0.07 = 7%). */
export function effectiveAnnualRate(ratePct: number, compounding: Compounding): number {
  const r = ratePct / 100;
  if (compounding === 'continuously') return Math.expm1(r);
  const n = COMPOUNDING_PER_YEAR[compounding];
  const base = 1 + r / n;
  // A nominal rate below -100%·n has no meaningful compounded value; treat it as total loss.
  return base <= 0 ? -1 : Math.pow(base, n) - 1;
}

/**
 * Simulates the account one contribution period at a time.
 *
 * When compounding and contribution frequencies differ, interest is applied at the
 * per-period rate equivalent to the effective annual rate. This is the same approach
 * most bank and brokerage calculators use, and it produces exact results whenever
 * the two frequencies match.
 */
export function simulate(inputs: ScenarioInputs, options: SimulateOptions = {}): SimulationResult {
  const years = Math.max(0, Math.floor(options.years ?? inputs.years));
  const inflation = (options.inflation ?? 0) / 100;
  const periods = CONTRIBUTIONS_PER_YEAR[inputs.contributionFrequency];
  const ear = effectiveAnnualRate(inputs.rate, inputs.compounding);
  const periodRate = ear <= -1 ? -1 : Math.pow(1 + ear, 1 / periods) - 1;
  const deflator = (t: number) => Math.pow(1 + inflation, t);
  const growth = inputs.contributionGrowth / 100;

  let balance = inputs.initial;
  let contributed = inputs.initial;
  let realContributed = inputs.initial;

  const points: Snapshot[] = [
    { t: 0, balance, contributed, realBalance: balance, realContributed },
  ];
  const rows: YearRow[] = [];

  for (let y = 0; y < years; y++) {
    const deposit = Math.max(0, inputs.contribution * Math.pow(1 + growth, y));
    const startBalance = balance;
    let yearContributions = 0;
    let yearInterest = 0;

    for (let k = 0; k < periods; k++) {
      if (inputs.contributionTiming === 'start') {
        balance += deposit;
        contributed += deposit;
        realContributed += deposit / deflator(y + k / periods);
        yearContributions += deposit;
      }

      const earned = balance * periodRate;
      balance += earned;
      yearInterest += earned;

      const t = y + (k + 1) / periods;
      if (inputs.contributionTiming === 'end') {
        balance += deposit;
        contributed += deposit;
        realContributed += deposit / deflator(t);
        yearContributions += deposit;
      }

      points.push({ t, balance, contributed, realBalance: balance / deflator(t), realContributed });
    }

    rows.push({
      year: y + 1,
      startBalance,
      contributions: yearContributions,
      interest: yearInterest,
      endBalance: balance,
      totalContributed: contributed,
      totalInterest: balance - contributed,
      realEndBalance: balance / deflator(y + 1),
    });
  }

  return { points, years: rows, final: points[points.length - 1], effectiveAnnualRate: ear };
}

export type ValueMode = 'nominal' | 'real';

/** Balance / contributed / gain for a snapshot in the chosen dollar basis. */
export function view(s: Snapshot, mode: ValueMode) {
  const balance = mode === 'real' ? s.realBalance : s.balance;
  const contributed = mode === 'real' ? s.realContributed : s.contributed;
  return { balance, contributed, gain: balance - contributed };
}
