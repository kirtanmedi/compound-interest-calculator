import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO, simulate, view } from './engine';
import { solve } from './solver';

const nominal = { inflation: 2.5, mode: 'nominal' as const };
const real = { inflation: 2.5, mode: 'real' as const };

const finalBalance = (inputs: typeof DEFAULT_SCENARIO, opts: typeof nominal | typeof real) =>
  view(simulate(inputs, { inflation: opts.inflation }).final, opts.mode).balance;

describe('solve', () => {
  it('finds the contribution that hits the target exactly', () => {
    const r = solve(DEFAULT_SCENARIO, 'contribution', 1_000_000, nominal);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(finalBalance({ ...DEFAULT_SCENARIO, contribution: r.value }, nominal)).toBeCloseTo(1_000_000, 4);
  });

  it('finds the initial deposit in real terms', () => {
    const r = solve(DEFAULT_SCENARIO, 'initial', 750_000, real);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(finalBalance({ ...DEFAULT_SCENARIO, initial: r.value }, real)).toBeCloseTo(750_000, 4);
  });

  it('finds the rate', () => {
    const r = solve(DEFAULT_SCENARIO, 'rate', 2_000_000, nominal);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(finalBalance({ ...DEFAULT_SCENARIO, rate: r.value }, nominal)).toBeCloseTo(2_000_000, -1);
    expect(r.value).toBeGreaterThan(DEFAULT_SCENARIO.rate);
  });

  it('finds the first period that crosses the target', () => {
    const r = solve(DEFAULT_SCENARIO, 'years', 1_000_000, nominal);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    const { points } = simulate(DEFAULT_SCENARIO, { years: 100 });
    const idx = points.findIndex((p) => p.t === r.value);
    expect(points[idx].balance).toBeGreaterThanOrEqual(1_000_000);
    expect(points[idx - 1].balance).toBeLessThan(1_000_000);
  });

  it('reports when the target is already met', () => {
    expect(solve({ ...DEFAULT_SCENARIO, initial: 2_000_000 }, 'years', 1_000_000, nominal)).toEqual({
      status: 'already',
      value: 0,
    });
    expect(solve(DEFAULT_SCENARIO, 'contribution', 50_000, nominal).status).toBe('already');
  });

  it('reports unreachable targets', () => {
    const broke = { ...DEFAULT_SCENARIO, initial: 0, contribution: 0 };
    expect(solve(broke, 'rate', 1_000, nominal).status).toBe('unreachable');
    expect(solve(broke, 'years', 1_000, nominal).status).toBe('unreachable');
    expect(solve({ ...DEFAULT_SCENARIO, rate: 0 }, 'years', 1e12, nominal).status).toBe('unreachable');
  });
});
