import { createContext, useContext, useSyncExternalStore } from 'react';

import type { ProState, ProStore } from './store';

export const ProStoreContext = createContext<ProStore | null>(null);

/** The pro store itself, for calling actions. Does not subscribe, so it never causes a re-render. */
export function useProStoreApi(): ProStore {
  const store = useContext(ProStoreContext);
  if (!store) throw new Error('Pro components must be rendered inside FramelineSkin.');
  return store;
}

/**
 * Subscribes to one slice of pro state. The component re-renders only when the selected value changes, so return a
 * primitive or a value taken straight from the state (not a new object or array).
 */
export function useProStore<T>(selector: (state: ProState) => T): T {
  const store = useProStoreApi();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
