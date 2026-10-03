import type { ScenarioInputs, ValueMode } from './engine';
import { SLOTS, type AppState, type ChartView, type Slot } from './state';
import type { SolveFor } from './solver';

export type Action =
  | { type: 'update'; slot: Slot; patch: Partial<ScenarioInputs> }
  | { type: 'add' }
  | { type: 'remove'; slot: Slot }
  | { type: 'select'; slot: Slot }
  | { type: 'inflation'; value: number }
  | { type: 'mode'; value: ValueMode }
  | { type: 'chart'; value: ChartView }
  | { type: 'goal'; patch: Partial<{ target: number; solveFor: SolveFor }> };

export const MAX_SCENARIOS = SLOTS.length;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'update':
      return {
        ...state,
        scenarios: state.scenarios.map((s) => (s.slot === action.slot ? { ...s, ...action.patch } : s)),
      };

    case 'add': {
      const used = new Set(state.scenarios.map((s) => s.slot));
      const slot = SLOTS.find((s) => !used.has(s));
      if (!slot) return state;
      // Start from a copy of the scenario being viewed so you only change what you're testing.
      const source = state.scenarios.find((s) => s.slot === state.active) ?? state.scenarios[0];
      const scenarios = [...state.scenarios, { ...source, slot }].sort(
        (x, y) => SLOTS.indexOf(x.slot) - SLOTS.indexOf(y.slot),
      );
      return { ...state, scenarios, active: slot, chart: 'compare' };
    }

    case 'remove': {
      if (state.scenarios.length <= 1) return state;
      const scenarios = state.scenarios.filter((s) => s.slot !== action.slot);
      return {
        ...state,
        scenarios,
        active: state.active === action.slot ? scenarios[0].slot : state.active,
        chart: scenarios.length > 1 ? state.chart : 'breakdown',
      };
    }

    case 'select':
      return { ...state, active: action.slot };

    case 'inflation':
      return { ...state, inflation: action.value };

    case 'mode':
      return { ...state, mode: action.value };

    case 'chart':
      return { ...state, chart: action.value === 'compare' && state.scenarios.length < 2 ? 'breakdown' : action.value };

    case 'goal':
      return { ...state, goal: { ...state.goal, ...action.patch } };
  }
}
