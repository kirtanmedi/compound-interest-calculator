import { LIMITS, type ScenarioInputs } from '../lib/engine';
import { percent } from '../lib/format';
import { COMPOUNDING_OPTIONS, FREQUENCY_OPTIONS, SLOT_COLOR, SLOT_LABEL, START_YEAR } from '../lib/labels';
import type { Scenario } from '../lib/state';
import { NumberField, Segmented, Select, SeriesKey } from './controls';

interface Props {
  scenario: Scenario;
  effectiveRate: number;
  showKey: boolean;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function InputsPanel({ scenario: s, effectiveRate, showKey, onChange }: Props) {
  return (
    <section className="card inputs" aria-labelledby="inputs-title">
      <header className="card__head">
        <h2 id="inputs-title" className="card__title">
          {showKey && <SeriesKey color={SLOT_COLOR[s.slot]} />}
          Scenario {SLOT_LABEL[s.slot]}
        </h2>
      </header>

      <div className="inputs__group">
        <NumberField
          label="Initial deposit"
          prefix="$"
          value={s.initial}
          min={LIMITS.money.min}
          max={LIMITS.money.max}
          step={1000}
          slider={{ min: 0, max: 1_000_000, scale: 'sqrt' }}
          onChange={(initial) => onChange({ initial })}
        />
      </div>

      <div className="inputs__group">
        <NumberField
          label="Contribution"
          prefix="$"
          value={s.contribution}
          min={LIMITS.money.min}
          max={LIMITS.money.max}
          step={50}
          slider={{ min: 0, max: 10_000, scale: 'sqrt' }}
          onChange={(contribution) => onChange({ contribution })}
          aside={
            <Select
              label="Contribution frequency"
              hideLabel
              value={s.contributionFrequency}
              options={FREQUENCY_OPTIONS}
              onChange={(contributionFrequency) => onChange({ contributionFrequency })}
            />
          }
        />
        <div className="inputs__pair">
          <div className="field">
            <div className="field__head">
              <span className="field__label">
                Deposit at
              </span>
            </div>
            <Segmented
              label="Deposit timing"
              value={s.contributionTiming}
              options={[
                { value: 'start', label: 'Start', title: 'Deposit at the start of each period (earns interest that period)' },
                { value: 'end', label: 'End', title: 'Deposit at the end of each period' },
              ]}
              onChange={(contributionTiming) => onChange({ contributionTiming })}
            />
          </div>
          <NumberField
            label="Yearly raise"
            suffix="%"
            value={s.contributionGrowth}
            min={LIMITS.growth.min}
            max={LIMITS.growth.max}
            step={0.5}
            compact
            onChange={(contributionGrowth) => onChange({ contributionGrowth })}
          />
        </div>
      </div>

      <div className="inputs__group">
        <NumberField
          label="Annual rate"
          suffix="%"
          value={s.rate}
          min={LIMITS.rate.min}
          max={LIMITS.rate.max}
          step={0.1}
          slider={{ min: 0, max: 15, step: 0.1 }}
          hint={s.compounding === 'annually' ? undefined : `APY ${percent(effectiveRate * 100)}`}
          onChange={(rate) => onChange({ rate })}
        />
        <Select
          label="Compounding"
          value={s.compounding}
          options={COMPOUNDING_OPTIONS}
          onChange={(compounding) => onChange({ compounding })}
        />
      </div>

      <div className="inputs__group">
        <NumberField
          label="Years"
          value={s.years}
          min={LIMITS.years.min}
          max={LIMITS.years.max}
          step={1}
          slider={{ min: 1, max: 60, step: 1 }}
          hint={`Ends ${START_YEAR + s.years}`}
          onChange={(years) => onChange({ years: Math.round(years) })}
        />
      </div>
    </section>
  );
}
