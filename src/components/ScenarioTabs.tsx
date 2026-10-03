import { moneyCompact } from '../lib/format';
import { SLOT_COLOR, SLOT_LABEL } from '../lib/labels';
import { MAX_SCENARIOS } from '../lib/reducer';
import type { Scenario, Slot } from '../lib/state';
import { SeriesKey } from './controls';

interface Props {
  scenarios: Scenario[];
  active: Slot;
  finals: Record<string, number>;
  onSelect: (slot: Slot) => void;
  onAdd: () => void;
  onRemove: (slot: Slot) => void;
}

export function ScenarioTabs({ scenarios, active, finals, onSelect, onAdd, onRemove }: Props) {
  const multi = scenarios.length > 1;
  return (
    <div className="tabs" role="tablist" aria-label="Scenarios">
      {scenarios.map((s) => (
        <div key={s.slot} className={`tab${s.slot === active ? ' is-active' : ''}`}>
          <button
            type="button"
            role="tab"
            aria-selected={s.slot === active}
            className="tab__main"
            onClick={() => onSelect(s.slot)}
          >
            <SeriesKey color={SLOT_COLOR[s.slot]} />
            <span className="tab__name">
              <span className="tab__word">Scenario </span>
              {SLOT_LABEL[s.slot]}
            </span>
            <span className="tab__value">{moneyCompact(finals[s.slot])}</span>
          </button>
          {multi && (
            <button
              type="button"
              className="tab__remove"
              aria-label={`Remove scenario ${SLOT_LABEL[s.slot]}`}
              title="Remove scenario"
              onClick={() => onRemove(s.slot)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
      {scenarios.length < MAX_SCENARIOS && (
        <button type="button" className="tab-add" onClick={onAdd} title="Copies the current scenario so you can tweak one thing">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {multi ? 'Add scenario' : 'Compare a scenario'}
        </button>
      )}
    </div>
  );
}
