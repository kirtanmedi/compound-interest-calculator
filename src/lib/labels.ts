import type { Compounding, ContributionFrequency } from './engine';
import type { Slot } from './state';

export const SLOT_LABEL: Record<Slot, string> = { a: 'A', b: 'B', c: 'C' };
export const SLOT_COLOR: Record<Slot, string> = {
  a: 'var(--series-1)',
  b: 'var(--series-2)',
  c: 'var(--series-3)',
};

export const COMPOUNDING_OPTIONS: { value: Compounding; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiannually', label: 'Semiannually' },
  { value: 'annually', label: 'Annually' },
  { value: 'continuously', label: 'Continuously' },
];

export const FREQUENCY_OPTIONS: { value: ContributionFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Yearly' },
];

/** "per month", "every 2 weeks" */
export const PER: Record<ContributionFrequency, string> = {
  weekly: 'per week',
  biweekly: 'every 2 weeks',
  monthly: 'per month',
  quarterly: 'per quarter',
  annually: 'per year',
};

export const START_YEAR = new Date().getFullYear();
