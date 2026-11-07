import type { RecordRow } from "./types";
export function metrics(rows: RecordRow[], peak: number) {
  const total = Math.max(0, ...rows.map((r) => r.end));
  const avg = (key: "response" | "wait") =>
    rows.reduce((n, r) => n + r[key], 0) / rows.length;
  const successful = rows.filter((r) => r.outcome === "Completed").length;
  return {
    total,
    response: avg("response"),
    wait: avg("wait"),
    throughput: total ? (successful * 1000) / total : null,
    peak,
    successful,
    failed: rows.filter((r) => r.outcome === "Failed").length,
    timedOut: rows.filter((r) => r.outcome === "Timed out").length,
    communication: rows.reduce((n, r) => n + r.communication, 0),
    order: rows.map((r) => r.id),
  };
}
