import { useState, Dispatch, SetStateAction } from "react";

// React's recommended replacement for "useEffect(() => setState(prop), [prop])":
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-when-a-prop-changes
// Adjusting state during render (guarded by comparing against the previous prop) lets
// React bail out before committing a stale frame, instead of committing once with old
// data and then re-rendering a moment later once the effect fires.
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [prev, setPrev] = useState(value);
  const [state, setState] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setState(value);
  }
  return [state, setState];
}
