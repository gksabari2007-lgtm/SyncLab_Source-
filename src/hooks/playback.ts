import { useEffect, useMemo, useState } from "react";
export function usePlayback(times: number[]) {
  const [clock, setClock] = useState(0),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [started, setStarted] = useState(false);
  const ticks = useMemo(
    () => [...new Set(times)].sort((a, b) => a - b),
    [times],
  );
  const end = ticks.at(-1) ?? 0;
  useEffect(() => {
    if (!running) return;
    let previous = performance.now(),
      id: number;
    const advance = (now: number) => {
      const delta = (now - previous) * speed;
      previous = now;
      setClock((t) => Math.min(end, t + delta));
      id = requestAnimationFrame(advance);
    };
    id = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(id);
  }, [running, speed, end]);
  useEffect(() => {
    if (running && clock >= end) setRunning(false);
  }, [clock, end, running]);
  function reset() {
    setRunning(false);
    setStarted(false);
    setClock(0);
  }
  function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    if (clock >= end) setClock(0);
    setStarted(true);
    setRunning(end > 0);
  }
  function step() {
    setRunning(false);
    setClock(
      !started ? (ticks[0] ?? 0) : (ticks.find((t) => t > clock) ?? end),
    );
    setStarted(true);
  }
  return { clock, running, speed, setSpeed, started, reset, toggle, step, end };
}
export type Player = ReturnType<typeof usePlayback>;
export function stamp(ms: number) {
  return (
    Math.floor(ms / 60000)
      .toString()
      .padStart(2, "0") +
    ":" +
    (Math.floor(ms / 1000) % 60).toString().padStart(2, "0") +
    "." +
    (Math.floor(ms) % 1000).toString().padStart(3, "0")
  );
}
