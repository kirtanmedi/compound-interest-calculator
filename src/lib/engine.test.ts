import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO, effectiveAnnualRate, simulate, view, type ScenarioInputs } from './engine';

const base: ScenarioInputs = { ...DEFAULT_SCENARIO, initial: 0, contribution: 0 };

describe('effectiveAnnualRate', () => {
  it('matches the standard compounding formulas', () => {
    expect(effectiveAnnualRate(12, 'annually')).toBeCloseTo(0.12, 12);
    expect(effectiveAnnualRate(12, 'monthly')).toBeCloseTo(Math.pow(1.01, 12) - 1, 12);
    expect(effectiveAnnualRate(12, 'daily')).toBeCloseTo(Math.pow(1 + 0.12 / 365, 365) - 1, 12);
    expect(effectiveAnnualRate(12, 'continuously')).toBeCloseTo(Math.exp(0.12) - 1, 12);
    expect(effectiveAnnualRate(0, 'monthly')).toBe(0);
  });
});

describe('simulate', () => {
  it('compounds a lump sum annually', () => {
    const r = simulate({ ...base, initial: 10_000, compounding: 'annually', years: 30 });
    expect(r.final.balance).toBeCloseTo(10_000 * Math.pow(1.07, 30), 6);
    expect(r.final.contributed).toBe(10_000);
  });

  it('compounds a lump sum continuously', () => {
    const r = simulate({ ...base, initial: 5_000, rate: 5, compounding: 'continuously', years: 10 });
    expect(r.final.balance).toBeCloseTo(5_000 * Math.exp(0.5), 6);
  });

  it('matches the future-value-of-annuity formula (deposits at period end)', () => {
    const i = 0.07 / 12;
    const n = 360;
    const expected = 10_000 * Math.pow(1 + i, n) + (500 * (Math.pow(1 + i, n) - 1)) / i;
    const r = simulate({ ...DEFAULT_SCENARIO });
    expect(r.final.balance).toBeCloseTo(expected, 4);
    expect(r.final.contributed).toBe(10_000 + 500 * 360);
  });

  it('matches the annuity-due formula (deposits at period start)', () => {
    const i = 0.06 / 12;
    const n = 120;
    const expected = ((200 * (Math.pow(1 + i, n) - 1)) / i) * (1 + i);
    const r = simulate({ ...base, contribution: 200, rate: 6, years: 10, contributionTiming: 'start' });
    expect(r.final.balance).toBeCloseTo(expected, 4);
  });

  it('uses the equivalent periodic rate when compounding and contribution frequencies differ', () => {
    // Annual compounding: a lump sum must still land exactly on P(1+r)^y at each year end.
    const r = simulate({ ...base, initial: 1_000, rate: 10, compounding: 'annually', years: 5 });
    r.years.forEach((row) => expect(row.endBalance).toBeCloseTo(1_000 * Math.pow(1.1, row.year), 8));
  });

  it('grows contributions by the yearly raise', () => {
    // Annual deposits at year end growing 3%/yr: growing-annuity sum.
    const r = simulate({
      ...base,
      contribution: 1_000,
      contributionFrequency: 'annually',
      contributionGrowth: 3,
      compounding: 'annually',
      rate: 5,
      years: 20,
    });
    let expected = 0;
    for (let y = 0; y < 20; y++) expected += 1_000 * Math.pow(1.03, y) * Math.pow(1.05, 19 - y);
    expect(r.final.balance).toBeCloseTo(expected, 6);
  });

  it('just sums deposits at a 0% rate', () => {
    const r = simulate({ ...base, initial: 100, contribution: 50, contributionFrequency: 'weekly', rate: 0, years: 2 });
    expect(r.final.balance).toBeCloseTo(100 + 50 * 104, 9);
    expect(r.points).toHaveLength(1 + 104);
  });

  it('produces year rows that reconcile', () => {
    const r = simulate({ ...DEFAULT_SCENARIO, years: 10 });
    expect(r.years).toHaveLength(10);
    let prevEnd = DEFAULT_SCENARIO.initial;
    for (const row of r.years) {
      expect(row.startBalance).toBeCloseTo(prevEnd, 8);
      expect(row.endBalance).toBeCloseTo(row.startBalance + row.contributions + row.interest, 8);
      expect(row.totalInterest).toBeCloseTo(row.endBalance - row.totalContributed, 8);
      prevEnd = row.endBalance;
    }
  });

  it('keeps purchasing power flat when the rate equals inflation', () => {
    const r = simulate({ ...base, initial: 10_000, rate: 3, compounding: 'annually', years: 25 }, { inflation: 3 });
    expect(r.final.realBalance).toBeCloseTo(10_000, 6);
    expect(view(r.final, 'real').gain).toBeCloseTo(0, 6);
  });

  it('reports a real loss when the rate trails inflation', () => {
    const r = simulate({ ...base, contribution: 100, rate: 0, years: 10 }, { inflation: 3 });
    const real = view(r.final, 'real');
    expect(real.contributed).toBeLessThan(r.final.contributed);
    expect(real.gain).toBeLessThan(0);
  });

  it('honors the horizon override', () => {
    const r = simulate({ ...DEFAULT_SCENARIO, years: 5 }, { years: 40 });
    expect(r.years).toHaveLength(40);
  });
});
