import { describe, expect, it } from 'vitest';
import { duration, moneyCompact, parseNumber } from './format';

describe('parseNumber', () => {
  it.each([
    ['1000', 1000],
    ['$1,000', 1000],
    ['1.5k', 1500],
    ['2M', 2_000_000],
    ['7.25%', 7.25],
    ['-3', -3],
    ['.5', 0.5],
  ])('parses %s', (raw, expected) => expect(parseNumber(raw)).toBe(expected));

  it.each(['', '-', 'abc', '1..2', '5x'])('rejects %s', (raw) => expect(parseNumber(raw)).toBeNull());
});

describe('format', () => {
  it('formats durations', () => {
    expect(duration(0)).toBe('0 mo');
    expect(duration(1)).toBe('1 yr');
    expect(duration(2.25)).toBe('2 yrs 3 mo');
    expect(duration(4.99)).toBe('5 yrs');
  });

  it('compacts money', () => {
    expect(moneyCompact(950)).toBe('$950');
    expect(moneyCompact(1_250_000)).toBe('$1.3M');
  });
});
