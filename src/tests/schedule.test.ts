import { describe, it, expect } from "vitest";
import { simulate } from "../engine/schedule";
import { newProcess, preset, presets } from "../data/workloads";
import type { Config, Process } from "../engine/types";
function job(
  id: number,
  duration: number,
  patch: Partial<Process> = {},
): Process {
  return { ...newProcess(id), duration, outbound: 0, inbound: 0, ...patch };
}
function workload(...processes: Process[]): Config {
  return { ...preset("Mixed Workload"), processes, concurrency: 2 };
}
const sync = (c: Config) => simulate(c, "Synchronous"),
  asyncRun = (c: Config) => simulate(c, "Asynchronous");
describe("virtual schedules", () => {
  const c = workload(job(1, 100), job(2, 40), job(3, 20));
  it("blocks until the previous terminal response", () => {
    expect(sync(c).records.map((r) => [r.start, r.end])).toEqual([
      [0, 100],
      [100, 140],
      [140, 160],
    ]);
  });
  it("allows overlap, frees the first slot, and tracks out-of-order responses", () => {
    const r = asyncRun(c);
    expect(r.metrics.order).toEqual(["P2", "P3", "P1"]);
    expect(r.metrics.total).toBe(100);
    expect(r.metrics.peak).toBe(2);
    expect(r.records[1].start).toBe(40);
  });
  it("reproduces sync with one slot on a success-only workload", () =>
    expect(asyncRun({ ...c, concurrency: 1 }).records).toEqual(
      sync(c).records,
    ));
  it("admits pending jobs by arrival with stable input ties", () => {
    const r = sync(
      workload(
        job(1, 10, { arrival: 18 }),
        job(2, 15, { arrival: 5 }),
        job(3, 10, { arrival: 18 }),
      ),
    );
    expect(r.metrics.order).toEqual(["P2", "P1", "P3"]);
    expect(r.metrics.total).toBe(40);
  });
  it("charges both wire legs and delivery overhead", () => {
    const r = asyncRun({
      ...workload(job(1, 100, { arrival: 55, outbound: 20, inbound: 30 })),
      overhead: 5,
    });
    expect(r.records[0]).toMatchObject({
      start: 55,
      end: 210,
      response: 155,
      communication: 50,
      wait: 5,
    });
    expect(r.metrics.peak).toBe(1);
  });
  it("computes exact averages and throughput", () => {
    expect(sync(c).metrics).toMatchObject({
      total: 160,
      response: 400 / 3,
      wait: 80,
      throughput: 18.75,
      successful: 3,
      failed: 0,
      communication: 0,
    });
  });
  it("defines zero-duration results without division by zero", () => {
    const r = sync(workload(job(1, 0)));
    expect(r.metrics).toMatchObject({
      total: 0,
      throughput: null,
      peak: 0,
      successful: 1,
    });
  });
  it("schedules identical completions in stable input order", () =>
    expect(asyncRun(workload(job(2, 50), job(1, 50))).metrics.order).toEqual([
      "P2",
      "P1",
    ]));
  it("does not mutate the workload", () => {
    const before = structuredClone(c);
    asyncRun(c);
    sync(c);
    expect(c).toEqual(before);
  });
  it.each(presets)("is monotonic and deterministic for %s", (name) => {
    for (const runner of [sync, asyncRun]) {
      const r = runner(preset(name));
      expect(r).toEqual(runner(preset(name)));
      expect(
        r.events.every((e, i) => !i || e.time >= r.events[i - 1].time),
      ).toBe(true);
      expect(r.events.filter((e) => e.type === "Terminal")).toHaveLength(5);
      expect(r.metrics.successful + r.metrics.failed + r.metrics.timedOut).toBe(
        5,
      );
    }
  });
});
describe("delivery and fault rules", () => {
  const c = workload(job(1, 83));
  it("direct waits and callbacks register separate notifications", () => {
    expect(
      sync({ ...c, mechanism: "Direct" }).events.some(
        (e) => e.type === "Await",
      ),
    ).toBe(true);
    expect(asyncRun(c).events.some((e) => e.type === "Subscribe")).toBe(true);
    expect(asyncRun(c).events.at(-1)?.message).toBe(
      "Completion callback invoked",
    );
  });
  it("polls on dispatch-relative ticks and includes detection delay", () => {
    const r = sync({ ...c, mechanism: "Polling", poll: 25 });
    expect(
      r.events.filter((e) => e.type === "Poll").map((e) => e.time),
    ).toEqual([25, 50, 75, 100]);
    expect(r.records[0]).toMatchObject({ end: 100, wait: 17 });
  });
  it("detects readiness on an exact polling boundary without another tick", () =>
    expect(
      sync({ ...workload(job(1, 100)), mechanism: "Polling", poll: 25 }).metrics
        .total,
    ).toBe(100));
  it("enqueues before delivery", () => {
    const r = asyncRun({
      ...c,
      mechanism: "Event queue",
      queue: 20,
      overhead: 5,
    });
    expect(r.events.find((e) => e.type === "Enqueue")?.time).toBe(88);
    expect(r.records[0].end).toBe(108);
  });
  it("lets response win a deadline tie", () =>
    expect(sync({ ...c, timeout: 83 }).metrics.successful).toBe(1));
  it("discards a late response without extending logical completion", () => {
    const r = asyncRun({ ...c, timeout: 40 });
    expect(r.records[0]).toMatchObject({ outcome: "Timed out", end: 40 });
    expect(r.events.at(-1)).toMatchObject({ type: "Late", time: 83 });
    expect(r.metrics.successful).toBe(0);
  });
  it("stops polling at timeout even when transport is ready", () => {
    const r = sync({ ...c, poll: 100, mechanism: "Polling", timeout: 90 });
    expect(r.metrics.timedOut).toBe(1);
    expect(r.events.some((e) => e.type === "Poll")).toBe(false);
  });
  it("discards expired queue notifications", () => {
    const r = sync({
      ...c,
      mechanism: "Event queue",
      queue: 100,
      timeout: 100,
    });
    expect(r.events.at(-1)).toMatchObject({ time: 183, type: "Late" });
    expect(r.metrics.total).toBe(100);
  });
  it("counts only consumed communication when deadline interrupts transmission", () => {
    const r = sync({
      ...workload(job(1, 100, { outbound: 50, inbound: 50 })),
      timeout: 160,
    });
    expect(r.metrics.communication).toBe(60);
  });
  it("caps retry attempts for injected failures", () => {
    const r = asyncRun({
      ...workload(job(1, 10, { failure: "Always" })),
      retries: 3,
      backoff: 15,
    });
    expect(r.records[0]).toMatchObject({
      outcome: "Failed",
      attempts: 4,
      end: 85,
      wait: 45,
    });
    expect(r.metrics.failed).toBe(1);
  });
  it("retries first-attempt failure while allowing unrelated async work", () => {
    const retry = {
      ...workload(job(1, 10, { failure: "First attempt" }), job(2, 15)),
      concurrency: 1,
      retries: 1,
      backoff: 50,
    };
    expect(asyncRun(retry).metrics.order).toEqual(["P2", "P1"]);
    expect(sync(retry).records.map((p) => p.start)).toEqual([0, 70]);
    expect(asyncRun(retry).records.at(-1)).toMatchObject({
      attempts: 2,
      end: 70,
      outcome: "Completed",
    });
  });
  it("ignores replies from superseded attempts", () => {
    const r = asyncRun({ ...c, timeout: 50, retries: 1, backoff: 0 });
    expect(r.events.filter((e) => e.type === "Late")).toHaveLength(2);
    expect(r.events.filter((e) => e.type === "Terminal")).toHaveLength(1);
    expect(r.metrics.total).toBe(100);
  });
  it("never exceeds configured capacity for 20 staggered jobs", () => {
    for (const limit of [1, 2, 5, 20]) {
      const c = {
        ...workload(
          ...Array.from({ length: 20 }, (_, i) =>
            job(i + 1, 50 + i * 12, { arrival: i * 4 }),
          ),
        ),
        concurrency: limit,
      };
      const r = asyncRun(c);
      for (let t = 0; t <= r.metrics.total; t++) {
        expect(
          r.records.filter((p) => p.start <= t && p.end > t).length,
        ).toBeLessThanOrEqual(limit);
      }
    }
  });
});
