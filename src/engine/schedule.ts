import { validate } from "../data/workloads";
import { metrics } from "./metrics";
import type {
  Config,
  Mode,
  Run,
  Event,
  Interval,
  Phase,
  Outcome,
  RecordRow,
} from "./types";
export function simulate(c: Config, mode: Mode): Run {
  const invalid = validate(c);
  if (invalid) throw Error(invalid);
  const events: Event[] = [],
    intervals: Interval[] = [],
    records: RecordRow[] = [];
  let seq = 0;
  function emit(
    time: number,
    id: string,
    attempt: number,
    type: string,
    status: Event["status"],
    message: string,
  ) {
    events.push({ time, seq: seq++, id, attempt, mode, type, status, message });
  }
  const sync = mode === "Synchronous";
  const jobs = c.processes.map((p, index) => ({
    p,
    index,
    ready: p.arrival,
    attempt: 1,
    first: -1,
    previous: p.arrival,
    communication: 0,
    wait: 0,
  }));
  for (const { p } of jobs)
    emit(p.arrival, p.id, 0, "Arrival", "Queued", "Request queued");
  const slots = Array<number>(sync ? 1 : c.concurrency).fill(0);
  const occupancy: { time: number; delta: number }[] = [];
  while (jobs.length) {
    // Synchronous retries retain ownership; asynchronous retries re-enter FIFO after backoff.
    jobs.sort((a, b) =>
      sync && a.attempt !== b.attempt
        ? b.attempt - a.attempt
        : a.ready - b.ready || a.index - b.index,
    );
    const job = jobs.shift()!,
      { p, attempt } = job;
    const slot = slots.indexOf(Math.min(...slots));
    const start = Math.max(slots[slot], job.ready);
    if (job.first < 0) job.first = start;
    const outbound = start + p.outbound,
      processed = outbound + p.duration,
      wire = processed + p.inbound;
    const ready = wire + c.overhead;
    let delivery = ready;
    if (c.mechanism === "Polling")
      delivery =
        start + Math.max(1, Math.ceil((ready - start) / c.poll)) * c.poll;
    if (c.mechanism === "Event queue") delivery += c.queue;
    const deadline = start + c.timeout,
      end = Math.min(delivery, deadline);
    function phase(phase: Phase, a: number, b: number) {
      if (b > a) intervals.push({ id: p.id, attempt, phase, start: a, end: b });
    }
    phase(attempt === 1 ? "Queued" : "Waiting", job.previous, start);
    job.wait += start - job.previous;
    function event(
      time: number,
      type: string,
      status: Event["status"],
      message: string,
    ) {
      if (time <= end) emit(time, p.id, attempt, type, status, message);
    }
    event(start, "Dispatch", "Dispatching", "Request dispatched");
    if (c.mechanism === "Callback")
      event(
        start,
        "Subscribe",
        "Dispatching",
        "Completion callback registered",
      );
    if (c.mechanism === "Direct")
      event(start, "Await", "Dispatching", "Caller awaiting reply");
    phase("Dispatching", start, Math.min(outbound, end));
    event(outbound, "Process", "Processing", "Processing started");
    phase("Processing", outbound, Math.min(processed, end));
    event(
      processed,
      "Transmit",
      "Responding",
      "Processing ended · transmitting response",
    );
    phase("Responding", processed, Math.min(wire, end));
    event(wire, "Receive", "Waiting", "Response reached client transport");
    phase("Waiting", wire, end);
    job.wait += Math.max(0, end - wire);
    job.communication +=
      Math.min(p.outbound, end - start) +
      Math.max(0, Math.min(p.inbound, end - processed));
    if (c.mechanism === "Event queue")
      event(ready, "Enqueue", "Waiting", "Notification queued");
    if (c.mechanism === "Polling")
      for (let t = start + c.poll; t <= end; t += c.poll)
        event(
          t,
          "Poll",
          t >= wire
            ? "Waiting"
            : t >= processed
              ? "Responding"
              : t >= outbound
                ? "Processing"
                : "Dispatching",
          t >= ready ? "Poll detected response" : "Poll · response unavailable",
        );
    const timeout = delivery > deadline;
    const fail =
      p.failure === "Always" ||
      (attempt === 1 && p.failure === "First attempt");
    const outcome: Outcome = timeout
      ? "Timed out"
      : fail
        ? "Failed"
        : "Completed";
    const retry = outcome !== "Completed" && attempt <= c.retries;
    if (timeout && wire > end)
      emit(
        wire,
        p.id,
        attempt,
        "Late",
        "Timed out",
        "Late transport response discarded",
      );
    if (timeout && wire <= end && c.mechanism !== "Polling")
      emit(
        delivery,
        p.id,
        attempt,
        "Late",
        "Timed out",
        "Expired delivery discarded",
      );
    slots[slot] = end;
    if (end > start)
      occupancy.push({ time: start, delta: 1 }, { time: end, delta: -1 });
    if (retry) {
      emit(
        end,
        p.id,
        attempt,
        "Retry",
        "Waiting",
        outcome + " · retry scheduled",
      );
      job.previous = end;
      job.ready = end + c.backoff;
      job.attempt++;
      jobs.push(job);
    } else {
      const message = timeout
        ? "Request deadline expired"
        : fail
          ? "Response reported failure"
          : {
              Direct: "Direct response received",
              Callback: "Completion callback invoked",
              Polling: "Response collected by poll",
              "Event queue": "Queued notification delivered",
            }[c.mechanism];
      emit(end, p.id, attempt, "Terminal", outcome, message);
      records.push({
        id: p.id,
        name: p.name,
        arrival: p.arrival,
        start: job.first,
        end,
        outcome,
        response: end - p.arrival,
        wait: job.wait,
        communication: job.communication,
        attempts: attempt,
      });
    }
  }
  events.sort((a, b) => a.time - b.time || a.seq - b.seq);
  // Stable terminal order uses event insertion order at equal times.
  records.sort((a, b) => a.end - b.end);
  let active = 0,
    peak = 0;
  for (const edge of occupancy.sort(
    (a, b) => a.time - b.time || a.delta - b.delta,
  )) {
    active += edge.delta;
    peak = Math.max(peak, active);
  }
  return { mode, events, intervals, records, metrics: metrics(records, peak) };
}
