import { useEffect, useMemo, useReducer, useState } from 'react';
import { GoalSolver } from './components/GoalSolver';
import { GrowthChart, type LineSeries } from './components/GrowthChart';
import { InputsPanel } from './components/InputsPanel';
import { ScenarioTabs } from './components/ScenarioTabs';
import { StatTiles } from './components/StatTiles';
import { YearTable } from './components/YearTable';
import { NumberField, Segmented } from './components/controls';
import { samplePoints } from './lib/chart';
import { LIMITS, simulate, view } from './lib/engine';
import { SLOT_COLOR, SLOT_LABEL } from './lib/labels';
import { reducer } from './lib/reducer';
import { decodeState, encodeState, type AppState } from './lib/state';

function writeUrl(state: AppState) {
  const query = encodeState(state);
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  if (url !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, '', url);
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => decodeState(window.location.search));
  const [copied, setCopied] = useState(false);

  // Keep the URL in sync so any scenario can be bookmarked or shared.
  useEffect(() => {
    const id = window.setTimeout(() => writeUrl(state), 200);
    return () => window.clearTimeout(id);
  }, [state]);

  const results = useMemo(
    () => Object.fromEntries(state.scenarios.map((s) => [s.slot, simulate(s, { inflation: state.inflation })])),
    [state.scenarios, state.inflation],
  );

  const active = state.scenarios.find((s) => s.slot === state.active) ?? state.scenarios[0];
  const activeResult = results[active.slot];
  const first = state.scenarios[0];
  const multi = state.scenarios.length > 1;
  // With no inflation, today's and future dollars are identical, so skip the inflation wording.
  const displayMode = state.inflation === 0 ? 'nominal' : state.mode;

  const finals = Object.fromEntries(
    state.scenarios.map((s) => [s.slot, view(results[s.slot].final, displayMode).balance]),
  );

  const series: LineSeries[] = state.scenarios.map((s) => ({
    id: s.slot,
    label: `Scenario ${SLOT_LABEL[s.slot]}`,
    color: SLOT_COLOR[s.slot],
    years: s.years,
    points: samplePoints(results[s.slot].points, s.years),
  }));

  const copyLink = async () => {
    writeUrl(state);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy this link', window.location.href);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 32 32" className="brand__mark" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="var(--surface-2)" />
            <path d="M6 24 L13 17 L18 20 L26 9" stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="brand__name">Compound interest</h1>
        </div>
        <div className="topbar__controls">
          <Segmented
            label="Dollar basis"
            size="sm"
            value={state.mode}
            options={[
              { value: 'nominal', label: 'Future $' },
              { value: 'real', label: "Today's $" },
            ]}
            onChange={(value) => dispatch({ type: 'mode', value })}
          />
          <div className="topbar__inflation">
            <NumberField
              label="Inflation"
              suffix="%"
              compact
              value={state.inflation}
              min={LIMITS.inflation.min}
              max={LIMITS.inflation.max}
              step={0.1}
              onChange={(value) => dispatch({ type: 'inflation', value })}
            />
          </div>
        </div>
        <button type="button" className="btn topbar__copy" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </header>

      <ScenarioTabs
        scenarios={state.scenarios}
        active={state.active}
        finals={finals}
        onSelect={(slot) => dispatch({ type: 'select', slot })}
        onAdd={() => dispatch({ type: 'add' })}
        onRemove={(slot) => dispatch({ type: 'remove', slot })}
      />

      <main className="layout">
        <div className="layout__side">
          <div className="slot slot--inputs">
            <InputsPanel
              scenario={active}
              showKey={multi}
              effectiveRate={activeResult.effectiveAnnualRate}
              onChange={(patch) => dispatch({ type: 'update', slot: active.slot, patch })}
            />
          </div>
          <div className="slot slot--goal">
            <GoalSolver
              scenario={active}
              target={state.goal.target}
              solveFor={state.goal.solveFor}
              inflation={state.inflation}
              mode={displayMode}
              onGoalChange={(patch) => dispatch({ type: 'goal', patch })}
              onApply={(patch) => dispatch({ type: 'update', slot: active.slot, patch })}
            />
          </div>
        </div>

        <div className="layout__main">
          <div className="slot slot--tiles">
            <StatTiles
              scenario={active}
              result={activeResult}
              mode={displayMode}
              baseline={multi && active.slot !== first.slot ? { scenario: first, result: results[first.slot] } : undefined}
            />
          </div>

          <section className="card slot slot--chart" aria-labelledby="chart-title">
            <header className="card__head">
              <h2 id="chart-title" className="card__title">
                {state.chart === 'compare' ? 'Scenarios compared' : `Growth · Scenario ${SLOT_LABEL[active.slot]}`}
                {displayMode === 'real' && <span className="tile__tag">today's $</span>}
              </h2>
              <Segmented
                label="Chart view"
                size="sm"
                value={state.chart}
                options={[
                  { value: 'breakdown', label: 'Breakdown' },
                  {
                    value: 'compare',
                    label: 'Compare',
                    disabled: !multi,
                    title: multi ? undefined : 'Add a scenario to compare',
                  },
                ]}
                onChange={(value) => dispatch({ type: 'chart', value })}
              />
            </header>
            {state.chart === 'compare' && multi ? (
              <GrowthChart kind="compare" mode={displayMode} series={series} activeId={active.slot} />
            ) : (
              <GrowthChart kind="breakdown" mode={displayMode} series={series.find((s) => s.id === active.slot)!} />
            )}
          </section>

          <div className="slot slot--table">
            <YearTable scenario={active} result={activeResult} />
          </div>
        </div>
      </main>

      <footer className="footer">
        Estimates only. Assumes a constant rate, no taxes or fees. When compounding and deposit frequencies differ,
        interest uses the equivalent per-deposit rate.
      </footer>
    </div>
  );
}
