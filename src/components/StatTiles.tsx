import { view, type SimulationResult, type ValueMode } from '../lib/engine';
import { money, moneyCompact, percent } from '../lib/format';
import { COMPOUNDING_OPTIONS, SLOT_LABEL, START_YEAR } from '../lib/labels';
import type { Scenario } from '../lib/state';

interface Props {
  scenario: Scenario;
  result: SimulationResult;
  mode: ValueMode;
  /** The first scenario, when viewing a different one, for "vs A" deltas. */
  baseline?: { scenario: Scenario; result: SimulationResult };
}

function Delta({ value, against }: { value: number; against: string }) {
  if (Math.abs(value) < 0.5) return <span className="delta">Same as {against}</span>;
  const up = value > 0;
  return (
    <span className={`delta ${up ? 'delta--up' : 'delta--down'}`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {moneyCompact(Math.abs(value))} {up ? 'more' : 'less'} than {against}
    </span>
  );
}

export function StatTiles({ scenario, result, mode, baseline }: Props) {
  const v = view(result.final, mode);
  const other = view(result.final, mode === 'real' ? 'nominal' : 'real');
  const deposits = v.contributed - scenario.initial;
  const share = v.balance > 0 ? (v.gain / v.balance) * 100 : 0;
  const multiple = v.contributed > 0 ? v.balance / v.contributed : 0;
  const baseV = baseline && view(baseline.result.final, mode);
  const baseLabel = baseline && `Scenario ${SLOT_LABEL[baseline.scenario.slot]}`;
  const compounding = COMPOUNDING_OPTIONS.find((o) => o.value === scenario.compounding)!.label.toLowerCase();

  return (
    <section className="tiles" aria-label="Results">
      <div className="tile tile--hero">
        <div className="tile__label">
          Final balance{mode === 'real' && <span className="tile__tag">today's $</span>}
        </div>
        <div className="tile__hero" data-testid="final-balance">
          {money(v.balance)}
        </div>
        <div className="tile__sub">
          in {START_YEAR + scenario.years}
          {Math.abs(other.balance - v.balance) >= 0.5 &&
            (mode === 'real' ? ` · ${money(other.balance)} in future dollars` : ` · ≈ ${money(other.balance)} in today's dollars`)}
        </div>
        {baseV && baseLabel && <Delta value={v.balance - baseV.balance} against={baseLabel} />}
      </div>

      <div className="tile">
        <div className="tile__label">Total contributed</div>
        <div className="tile__value">{money(v.contributed)}</div>
        <div className="tile__sub">
          {mode === 'real'
            ? 'Each deposit valued in today’s dollars'
            : `${moneyCompact(scenario.initial)} initial + ${moneyCompact(deposits)} deposits`}
        </div>
      </div>

      <div className="tile">
        <div className="tile__label">{mode === 'real' ? 'Real gain' : 'Interest earned'}</div>
        <div className="tile__value">{money(v.gain)}</div>
        <div className="tile__sub">
          {v.gain >= 0 ? `${percent(share, 0)} of balance · ` : 'Inflation outpaced growth · '}
          {multiple.toFixed(2)}× your money
        </div>
      </div>

      <div className="tile">
        <div className="tile__label">Effective yield</div>
        <div className="tile__value">{percent(result.effectiveAnnualRate * 100)}</div>
        <div className="tile__sub">
          {percent(scenario.rate)} compounded {compounding}
        </div>
      </div>
    </section>
  );
}
