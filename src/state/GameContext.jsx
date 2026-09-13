import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { reducer } from './reducer.js';
import { freshState } from './initialState.js';
import { loadSave, writeSave } from './persistence.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => loadSave() ?? freshState());

  useEffect(() => {
    writeSave(state);
  }, [state.player, state.ladder, state.training]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
