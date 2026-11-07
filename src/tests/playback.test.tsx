import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { usePlayback } from "../hooks/playback";
const times = [0, 40, 40, 100, 250];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("pauses without clock drift, resumes and resets the run", () => {
  const { result } = renderHook(() => usePlayback(times));
  act(() => result.current.toggle());
  act(() => vi.advanceTimersByTime(64));
  expect(result.current.clock).toBeGreaterThan(0);
  act(() => result.current.toggle());
  const paused = result.current.clock;
  act(() => vi.advanceTimersByTime(200));
  expect(result.current.clock).toBe(paused);
  act(() => result.current.toggle());
  act(() => vi.advanceTimersByTime(32));
  expect(result.current.clock).toBeGreaterThan(paused);
  act(() => result.current.reset());
  expect(result.current).toMatchObject({
    clock: 0,
    started: false,
    running: false,
  });
  act(() => vi.advanceTimersByTime(100));
  expect(result.current.clock).toBe(0);
});
it("steps equal timestamps once and clamps to the last timestamp", () => {
  const { result } = renderHook(() => usePlayback(times));
  for (const t of [0, 40, 100, 250, 250]) {
    act(() => result.current.step());
    expect(result.current.clock).toBe(t);
  }
});
it("applies playback speed without modifying scheduled events", () => {
  const { result } = renderHook(() => usePlayback(times));
  act(() => result.current.setSpeed(5));
  act(() => result.current.toggle());
  act(() => vi.advanceTimersByTime(64));
  expect(result.current).toMatchObject({ clock: 250, running: false });
  act(() => result.current.toggle());
  expect(result.current.clock).toBe(0);
});
it("steps straight to the first delayed arrival", () => {
  const { result } = renderHook(() => usePlayback([80, 100]));
  act(() => result.current.step());
  expect(result.current.clock).toBe(80);
});
