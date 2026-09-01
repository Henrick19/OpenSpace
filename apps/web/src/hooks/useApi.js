import { useEffect, useState } from "react";

export function useApi(loadData, initialData) {
  const [state, setState] = useState({ data: initialData, error: null, loading: true });

  useEffect(() => {
    let active = true;
    loadData()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: initialData, error: error.message, loading: false }));
    return () => { active = false; };
  }, [loadData, initialData]);

  return state;
}
