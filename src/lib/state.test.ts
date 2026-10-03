import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO } from './engine';
import { DEFAULT_STATE, decodeState, encodeState, type AppState } from './state';

describe('URL state', () => {
  it('encodes the default state as an empty query', () => {
    expect(encodeState(DEFAULT_STATE)).toBe('');
    expect(decodeState('')).toEqual(DEFAULT_STATE);
  });

  it('round-trips a multi-scenario state', () => {
    const state: AppState = {
      scenarios: [
        { ...DEFAULT_SCENARIO, slot: 'a', initial: 25_000, rate: 8.5, compounding: 'daily' },
        {
          ...DEFAULT_SCENARIO,
          slot: 'c',
          contribution: 1_250.5,
          contributionFrequency: 'biweekly',
          contributionTiming: 'start',
          contributionGrowth: 3,
          years: 40,
        },
      ],
      active: 'c',
      inflation: 3.1,
      mode: 'nominal',
      chart: 'compare',
      goal: { target: 2_500_000, solveFor: 'rate' },
    };
    const query = encodeState(state);
    expect(query).toContain('sc=ac');
    expect(query).toContain('p=25000');
    expect(query).toContain('c_c=1250.5');
    expect(query).toContain('real=0');
    expect(decodeState(query)).toEqual(state);
  });

  it("defaults to today's dollars with 0% inflation", () => {
    expect(DEFAULT_STATE.mode).toBe('real');
    expect(DEFAULT_STATE.inflation).toBe(0);
    expect(DEFAULT_STATE.scenarios[0].rate).toBe(7);
    expect(decodeState('?real=1').mode).toBe('real');
    expect(decodeState('?real=0').mode).toBe('nominal');
  });

  it('clamps and ignores garbage', () => {
    const s = decodeState('?r=9999&y=-4&p=abc&f=nope&sc=zzz&a=b&view=compare&goal=0');
    expect(s.scenarios).toHaveLength(1);
    expect(s.scenarios[0].rate).toBe(100);
    expect(s.scenarios[0].years).toBe(1);
    expect(s.scenarios[0].initial).toBe(DEFAULT_SCENARIO.initial);
    expect(s.scenarios[0].contributionFrequency).toBe('monthly');
    expect(s.active).toBe('a');
    // Compare needs at least two scenarios.
    expect(s.chart).toBe('breakdown');
    expect(s.goal.target).toBe(1);
  });
});
