import { createContext, useContext } from 'react';
import type { Operation } from './inventory-api';
interface Actions {
  locked: boolean;
  run: (operation: Operation) => Promise<boolean>;
}
export const ActionsContext = createContext<Actions | null>(null);
export function useStockActions() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('Missing inventory actions');
  return value;
}
