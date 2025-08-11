import { createContext, useContext } from 'react';
import type { Actions } from '../utils/actions.ts';
import type { States, SetStates } from '../utils/states.ts';

export const AppContext = createContext<{
  states: States;
  setStates: SetStates;
  actions: Actions;
} | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
