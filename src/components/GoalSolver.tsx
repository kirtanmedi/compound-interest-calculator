import { useMemo } from 'react';
import { LIMITS, type ScenarioInputs, type ValueMode } from '../lib/engine';
import { duration, money, moneyCents, percent } from '../lib/format';
import { PER, SLOT_LABEL } from '../lib/labels';
import { solve, type SolveFor } from '../lib/solver';
import type { Scenario } from '../lib/state';
import { NumberField, Select } from './controls';

interface Props {
  scenario: Scenario;
  target: number;
  solveFor: SolveFor;
  inflation: number;
  mode: ValueMode;
  onGoalChange: (patch: Partial<{ target: number; solveFor: SolveFor }>) => void;
  onApply: (patch: Partial<ScenarioInputs>) => void;
}

const SOLVE_OPTIONS: { value: SolveFor; label: string }[] = [
  { value: 'contribution', label: 'Contribution needed' },
  { value: 'initial', label: 'Initial deposit needed' },
  { value: 'rate', label: 'Rate needed' },
  { value: 'years', label: 'Time needed' },
];

export function GoalSolver({ scenario, target, solveFor, inflation, mode, onGoalChange, onApply }: Props) {
  const result = useMemo(
    () => solve(scenario, solveFor, target, { inflation, mode }),
    [scenario, solveFor, target, inflation, mode],
  );

  let headline: string;
  let detail: string;
  let patch: Partial<ScenarioInputs> | null = null;

  if (result.status === 'unreachable') {
    headline = 'Out of reach';
    detail = {
      contribution: `Would need more than ${money(LIMITS.money.max)} per deposit.`,
      initial: `Would need more than ${money(LIMITS.money.max)} up front.`,
      rate: 'Not reachable even at 100% a year.',
      years: `Not reachable within ${LIMITS.years.max} years at these settings.`,
    }[solveFor];
  } else if (result.status === 'already') {
    headline = solveFor === 'years' ? 'Already there' : solveFor === 'rate' ? 'Any rate works' : '$0';
    detail = {
      contribution: 'Your initial deposit alone gets you there. No contributions needed.',
      initial: 'Your contributions alone get you there. No starting balance needed.',
      rate: 'You hit the target even at a deeply negative rate.',
      years: 'Your starting balance already meets the target.',
    }[solveFor];
  } else {
    const v = result.value;
    switch (solveFor) {
      case 'contribution': {
        const amount = Math.ceil(v * 100) / 100;
        headline = `${moneyCents(amount)} ${PER[scenario.contributionFrequency]}`;
        detail = `Instead of ${moneyCents(scenario.contribution)} now.`;
        patch = { contribution: amount };
        break;
      }
      case 'initial': {
        const amount = Math.ceil(v);
        headline = money(amount);
        detail = `Up front, instead of ${money(scenario.initial)}.`;
        patch = { initial: amount };
        break;
      }
      case 'rate': {
        const rate = Math.ceil(v * 100) / 100;
        headline = `${percent(rate)} a year`;
        detail = `Instead of ${percent(scenario.rate)}, compounded the same way.`;
        patch = { rate };
        break;
      }
      case 'years': {
        headline = duration(v);
        const years = Math.ceil(v - 1e-9);
        detail = years === scenario.years ? 'Right on your current horizon.' : `Your current horizon is ${scenario.years} years.`;
        patch = years === scenario.years ? null : { years: Math.max(LIMITS.years.min, years) };
        break;
      }
    }
  }

  return (
    <section className="card goal" aria-labelledby="goal-title">
      <header className="card__head">
        <h2 id="goal-title" className="card__title">
          Goal
        </h2>
        <span className="card__meta">Scenario {SLOT_LABEL[scenario.slot]}</span>
      </header>
      <NumberField
        label={mode === 'real' ? "Target (today's $)" : 'Target balance'}
        prefix="$"
        value={target}
        min={1}
        max={LIMITS.money.max}
        step={10_000}
        onChange={(t) => onGoalChange({ target: t })}
      />
      <Select label="Solve for" value={solveFor} options={SOLVE_OPTIONS} onChange={(s) => onGoalChange({ solveFor: s })} />
      <div className="goal__result" aria-live="polite">
        <div className="goal__headline">{headline}</div>
        <div className="goal__detail">{detail}</div>
        {patch && (
          <button type="button" className="btn btn--ghost" onClick={() => onApply(patch!)}>
            Apply to scenario {SLOT_LABEL[scenario.slot]}
          </button>
        )}
      </div>
    </section>
  );
}
