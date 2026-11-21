import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'who'; create?: boolean }
  | { name: 'map'; profileId: string }
  | { name: 'level'; profileId: string; levelId: string }
  | { name: 'petHome'; profileId: string }
  | { name: 'album'; profileId: string }
  | { name: 'gate' }
  | { name: 'parent' }
  | { name: 'levels' };

const START: Route = { name: 'who' };

/**
 * Minimal in-memory router backed by history state, so the Android back
 * gesture walks back through screens instead of closing the app.
 */
export function useRouter() {
  const [route, setRoute] = useState<Route>(() => (history.state as Route | null) ?? START);

  useEffect(() => {
    if (!history.state) history.replaceState(START, '');
    const onPop = (e: PopStateEvent) => setRoute((e.state as Route | null) ?? START);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next: Route) => {
    history.pushState(next, '');
    setRoute(next);
  }, []);

  const back = useCallback(() => history.back(), []);

  /** Jump to a screen and forget the history (e.g. switching child). */
  const reset = useCallback((next: Route) => {
    history.replaceState(next, '');
    setRoute(next);
  }, []);

  return { route, go, back, reset };
}
