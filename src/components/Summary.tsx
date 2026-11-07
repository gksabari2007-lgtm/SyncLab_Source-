import { Timer, Layers3, TrendingDown, Activity } from "lucide-react";
import type { Run } from "../engine/types";
export const format = (v: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: 2 });
const seconds = (v: number) => format(v / 1000) + " s";
export function insight([s, a]: Run[]) {
  const diff = s.metrics.total - a.metrics.total;
  if (!diff)
    return "Both models finish at the same virtual time. The selected workload gains no elapsed-time advantage from additional in-flight slots.";
  return (
    (diff > 0 ? "Asynchronous" : "Synchronous") +
    " execution finishes " +
    seconds(Math.abs(diff)) +
    " earlier. " +
    (diff > 0
      ? "The asynchronous schedule reaches " +
        a.metrics.peak +
        " simultaneous in-flight requests."
      : "Inspect dispatch and retry ordering to see where the schedules diverge.")
  );
}
export function Summary({ runs: [s, a] }: { runs: Run[] }) {
  const diff = s.metrics.total - a.metrics.total;
  const cards = [
    {
      icon: Timer,
      label: "Synchronous time",
      value: seconds(s.metrics.total),
      sub: "Blocking execution",
      tone: "purple",
    },
    {
      icon: Activity,
      label: "Asynchronous time",
      value: seconds(a.metrics.total),
      sub: "Concurrent execution",
      tone: "teal",
    },
    {
      icon: TrendingDown,
      label: "Time difference",
      value: seconds(diff),
      sub: s.metrics.total
        ? format((diff / s.metrics.total) * 100) + "% of synchronous time"
        : "Zero-duration workload",
      tone: "blue",
    },
    {
      icon: Layers3,
      label: "Peak in flight",
      value: String(a.metrics.peak),
      sub: "Asynchronous requests",
      tone: "gold",
    },
  ];
  return (
    <div className="summary">
      {cards.map(({ icon: Icon, label, value, sub, tone }) => (
        <div className={"stat " + tone} key={label}>
          <div>
            <span>{label}</span>
            <Icon size={16} />
          </div>
          <strong>{value}</strong>
          <small>{sub}</small>
        </div>
      ))}
    </div>
  );
}
