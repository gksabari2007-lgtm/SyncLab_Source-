import { useMemo } from "react";
import type { Run, Event } from "../engine/types";
// Polls may be numerous; index only events that change a process state.
export function useLifecycle(runs: Run[], clock: number) {
  const byModel = useMemo(
    () =>
      runs.map((run) => {
        const processes = new Map<string, Event[]>();
        for (const event of run.events) {
          if (event.type === "Late") continue;
          const entries = processes.get(event.id) ?? [];
          if (entries.at(-1)?.status !== event.status) entries.push(event);
          processes.set(event.id, entries);
        }
        return processes;
      }),
    [runs],
  );
  return useMemo(
    () =>
      byModel.map((processes) => {
        const states = new Map<string, string>();
        for (const [id, events] of processes) {
          let lo = 0,
            hi = events.length;
          while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (events[mid].time <= clock) lo = mid + 1;
            else hi = mid;
          }
          if (lo) states.set(id, events[lo - 1].status);
        }
        return states;
      }),
    [clock, byModel],
  );
}
