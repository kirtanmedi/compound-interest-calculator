import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO, simulate } from './engine';
import { nearestIndex, niceTicks, samplePoints } from './chart';

describe('niceTicks', () => {
  it('produces round steps that cover the range', () => {
    expect(niceTicks(0, 687_000)).toEqual([0, 200_000, 400_000, 600_000, 800_000]);
    expect(niceTicks(0, 30, 6)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(niceTicks(0, 1)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
});

describe('samplePoints / nearestIndex', () => {
  it('keeps year ends for long horizons and everything for short ones', () => {
    const long = simulate(DEFAULT_SCENARIO);
    expect(samplePoints(long.points, 30)).toHaveLength(31);
    const short = simulate({ ...DEFAULT_SCENARIO, years: 3 });
    expect(samplePoints(short.points, 3)).toHaveLength(37);
  });

  it('finds the closest snapshot', () => {
    const pts = samplePoints(simulate(DEFAULT_SCENARIO).points, 30);
    expect(nearestIndex(pts, 0)).toBe(0);
    expect(nearestIndex(pts, 4.4)).toBe(4);
    expect(nearestIndex(pts, 4.6)).toBe(5);
    expect(nearestIndex(pts, 99)).toBe(30);
  });
});
