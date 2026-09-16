import { useEffect, useState } from "react";

/**
 * Runs an asynchronous frontend service function and exposes a standard
 * loading/data/error state to a page component.
 */
export function useApi(loadData, initialData) {
  const [state, setState] = useState({ data: initialData, error: null, loading: true });

  useEffect(() => {
    // Ignore late promise results after the component has unmounted.
    let active = true;
    loadData()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: initialData, error: error.message, loading: false }));
    return () => { active = false; };
  }, [loadData, initialData]);

  return state;
}
