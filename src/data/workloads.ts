import type { Config, Process } from "../engine/types";
export const presets = [
  "Mixed Workload",
  "Low Latency",
  "High Latency",
  "Slow Server",
  "Unpredictable Response Order",
  "Failure and Timeout Scenario",
] as const;
const names = [
  "Authentication Request",
  "Database Query",
  "File Processing",
  "API Request",
  "Data Synchronization",
];
export function newProcess(index: number): Process {
  return {
    id: "P" + index,
    name: names[index - 1] || "Process " + index,
    arrival: 0,
    outbound: 100,
    duration: 500,
    inbound: 100,
    failure: "Never",
  };
}
export function preset(name: string): Config {
  const processes = names.map((_, i) => ({
    ...newProcess(i + 1),
    outbound: [150, 90, 160, 75, 140][i],
    duration: [570, 950, 1350, 430, 850][i],
    inbound: [120, 110, 130, 95, 110][i],
  }));
  for (const [i, p] of processes.entries()) {
    if (name === "Low Latency") p.outbound = p.inbound = 10;
    if (name === "High Latency") p.outbound = p.inbound = 700;
    if (name === "Slow Server") p.duration *= 4;
    if (name === "Unpredictable Response Order") {
      p.duration = [1900, 150, 420, 55, 700][i];
      p.arrival = i * 50;
    }
    if (name === "Failure and Timeout Scenario") {
      p.duration = i === 2 ? 3200 : 400;
      p.failure = i === 0 ? "First attempt" : i === 4 ? "Always" : "Never";
    }
  }
  return {
    processes,
    concurrency: 3,
    mechanism: "Callback",
    overhead: 0,
    timeout: name === "Failure and Timeout Scenario" ? 1800 : 10000,
    retries: name === "Failure and Timeout Scenario" ? 1 : 0,
    backoff: 200,
    poll: 200,
    queue: 100,
  };
}
export const limits = {
  arrival: [0, 60000],
  outbound: [0, 60000],
  duration: [0, 60000],
  inbound: [0, 60000],
  overhead: [0, 60000],
  timeout: [1, 120000],
  retries: [0, 3],
  backoff: [0, 60000],
  poll: [25, 60000],
  queue: [0, 60000],
  concurrency: [1, 20],
} as const;
export function validate(value: unknown): string {
  if (!value || typeof value !== "object")
    return "Configuration must be an object.";
  const c = value as Config;
  if (
    !Array.isArray(c.processes) ||
    c.processes.length < 1 ||
    c.processes.length > 20
  )
    return "Choose between 1 and 20 processes.";
  if (!["Direct", "Callback", "Polling", "Event queue"].includes(c.mechanism))
    return "Choose a supported response mechanism.";
  function invalid(key: keyof typeof limits, n: number) {
    const [min, max] = limits[key];
    return !Number.isSafeInteger(n) || n < min || n > max
      ? key + " must be an integer from " + min + " to " + max + "."
      : "";
  }
  for (const key of [
    "concurrency",
    "timeout",
    "retries",
    "backoff",
    "poll",
    "queue",
    "overhead",
  ] as const) {
    const msg = invalid(key, c[key]);
    if (msg) return msg;
  }
  const ids = new Set<string>();
  for (const p of c.processes) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^P[1-9]\d{0,5}$/.test(p.id) ||
      ids.has(p.id)
    )
      return "Process IDs must be unique P-numbers.";
    ids.add(p.id);
    if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 64)
      return p.id + " needs a name of 1–64 characters.";
    if (!["Never", "First attempt", "Always"].includes(p.failure))
      return "Invalid failure behavior.";
    for (const key of ["arrival", "duration", "outbound", "inbound"] as const) {
      const msg = invalid(key, p[key]);
      if (msg) return p.id + " " + msg;
    }
  }
  return "";
}
export function decodeSaved(raw: string | null): Config {
  if (!raw) throw Error("No saved configuration yet.");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw Error("Saved configuration contains invalid JSON.");
  }
  if (data?.version !== 1)
    throw Error("Unsupported saved configuration version.");
  const error = validate(data.config);
  if (error) throw Error(error);
  return data.config;
}
