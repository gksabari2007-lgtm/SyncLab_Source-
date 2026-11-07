export type Mode = "Synchronous" | "Asynchronous";
export type Mechanism = "Direct" | "Callback" | "Polling" | "Event queue";
export type Outcome = "Completed" | "Failed" | "Timed out";
export type Phase =
  "Queued" | "Dispatching" | "Processing" | "Responding" | "Waiting";
export interface Process {
  id: string;
  name: string;
  arrival: number;
  outbound: number;
  duration: number;
  inbound: number;
  failure: "Never" | "First attempt" | "Always";
}
export interface Config {
  processes: Process[];
  concurrency: number;
  mechanism: Mechanism;
  overhead: number;
  timeout: number;
  retries: number;
  backoff: number;
  poll: number;
  queue: number;
}
export interface Event {
  time: number;
  seq: number;
  id: string;
  attempt: number;
  mode: Mode;
  type: string;
  status: Phase | Outcome;
  message: string;
}
export interface Interval {
  id: string;
  attempt: number;
  phase: Phase;
  start: number;
  end: number;
}
export interface RecordRow {
  id: string;
  name: string;
  arrival: number;
  start: number;
  end: number;
  outcome: Outcome;
  response: number;
  wait: number;
  communication: number;
  attempts: number;
}
export interface Run {
  mode: Mode;
  events: Event[];
  intervals: Interval[];
  records: RecordRow[];
  metrics: ReturnType<typeof import("./metrics").metrics>;
}
