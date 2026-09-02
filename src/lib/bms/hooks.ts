import { useEffect, useSyncExternalStore } from "react";
import { getEngine } from "./engine";
import type { BmsState } from "./types";

export function useBms(): BmsState {
  const engine = getEngine();
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  useEffect(() => {
    engine.start();
  }, [engine]);
  return state;
}

export function useBmsActions() {
  return getEngine();
}
