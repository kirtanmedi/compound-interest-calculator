import type { SimulationResult } from '../lib/engine';
import { money } from '../lib/format';
import { SLOT_LABEL, START_YEAR } from '../lib/labels';
import type { Scenario } from '../lib/state';

interface Props {
  scenario: Scenario;
  result: SimulationResult;
}

const COLUMNS = ['Year', 'Deposits', 'Interest', 'Total contributed', 'Total interest', 'Balance', "Balance (today's $)"];

function downloadCsv(scenario: Scenario, result: SimulationResult) {
  const rows = result.years.map((r) =>
    [r.year, START_YEAR + r.year, r.contributions, r.interest, r.totalContributed, r.totalInterest, r.endBalance, r.realEndBalance]
      .map((v, i) => (i < 2 ? String(v) : v.toFixed(2)))
      .join(','),
  );
  const header = ['Year', 'Calendar year', ...COLUMNS.slice(1)].map((h) => `"${h}"`).join(',');
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compound-interest-scenario-${SLOT_LABEL[scenario.slot].toLowerCase()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function YearTable({ scenario, result }: Props) {
  return (
    <section className="card table-card" aria-labelledby="table-title">
      <header className="card__head">
        <h2 id="table-title" className="card__title">
          Year by year
        </h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => downloadCsv(scenario, result)}>
          Download CSV
        </button>
      </header>
      <div className="table-scroll" tabIndex={0} aria-label="Year by year table">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.years.map((r) => (
              <tr key={r.year}>
                <th scope="row">
                  {r.year} <span className="table__muted">{START_YEAR + r.year}</span>
                </th>
                <td>{money(r.contributions)}</td>
                <td>{money(r.interest)}</td>
                <td>{money(r.totalContributed)}</td>
                <td>{money(r.totalInterest)}</td>
                <td className="table__strong">{money(r.endBalance)}</td>
                <td>{money(r.realEndBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
