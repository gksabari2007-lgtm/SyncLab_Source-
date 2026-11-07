import { Lightbulb } from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Run } from "../engine/types";
import { format, Summary, insight } from "./Summary";
const definitions = [
  [
    "total",
    "Workload completion",
    "Time from virtual zero to the last logical terminal event.",
    "ms",
  ],
  [
    "response",
    "Average response",
    "Mean time from arrival to terminal outcome, including retries.",
    "ms",
  ],
  [
    "wait",
    "Average waiting",
    "Mean queue, backoff and post-transport delivery waits.",
    "ms",
  ],
  [
    "throughput",
    "Throughput",
    "Successful processes per second of workload time. Undefined at zero elapsed time.",
    "/s",
  ],
  [
    "peak",
    "Peak in flight",
    "Maximum overlapping positive-duration attempt lifetimes.",
    "",
  ],
  [
    "successful",
    "Successful",
    "Processes that received a successful terminal response.",
    "",
  ],
  [
    "failed",
    "Failed",
    "Processes ending with an injected failure after available retries.",
    "",
  ],
  [
    "timedOut",
    "Timed out",
    "Processes ending at their final attempt deadline.",
    "",
  ],
  [
    "communication",
    "Communication delay",
    "Sum of outbound and inbound time consumed before each attempt ends.",
    "ms",
  ],
  [
    "order",
    "Completion order",
    "Process IDs in terminal-event order, including failures and timeouts.",
    "",
  ],
] as const;
export function Analytics({ runs }: { runs: Run[] }) {
  const [sync, asyncRun] = runs;
  const completion = [
    ...new Set([0, ...runs.flatMap((r) => r.records.map((p) => p.end))]),
  ]
    .sort((a, b) => a - b)
    .map((t) => ({
      time: t,
      Synchronous: sync.records.filter((p) => p.end <= t).length,
      Asynchronous: asyncRun.records.filter((p) => p.end <= t).length,
    }));
  const response = sync.records
    .map((row) => ({
      name: row.id,
      Synchronous: row.response,
      Asynchronous: asyncRun.records.find((p) => p.id === row.id)!.response,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const totals = [
    {
      name: "Workload",
      Synchronous: sync.metrics.total,
      Asynchronous: asyncRun.metrics.total,
    },
  ];
  const tooltip = {
    background: "#111a29",
    border: "1px solid #39465a",
    borderRadius: 7,
  };
  const axis = { fill: "#b6c1d3", fontSize: 11 };
  const models = [
    { name: "Synchronous", color: "#a18cff" },
    { name: "Asynchronous", color: "#54ddbc" },
  ];
  function bars(data: typeof response) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#293448" vertical={false} />
          <XAxis dataKey="name" tick={axis} interval="preserveStartEnd" />
          <YAxis tick={axis} width={55} unit=" ms" />
          <Tooltip contentStyle={tooltip} cursor={{ fill: "#273145" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {models.map((m) => (
            <Bar
              key={m.name}
              dataKey={m.name}
              fill={m.color}
              maxBarSize={52}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <>
      <Summary runs={runs} />
      <div className="insight">
        <Lightbulb />
        <p>{insight(runs)}</p>
      </div>
      <div className="chartgrid">
        <section className="panel">
          <div className="panelhead">
            <h2>Execution time comparison</h2>
          </div>
          <div className="chartbody">{bars(totals)}</div>
        </section>
        <section className="panel">
          <div className="panelhead">
            <h2>Completion progress</h2>
          </div>
          <div className="chartbody">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={completion}
                margin={{ left: 0, right: 20, top: 8 }}
              >
                <CartesianGrid stroke="#293448" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[0, Math.max(1, ...runs.map((r) => r.metrics.total))]}
                  tick={axis}
                  unit=" ms"
                />
                <YAxis width={34} tick={axis} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltip}
                  labelFormatter={(v) => v + " ms"}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {models.map((m) => (
                  <Line
                    key={m.name}
                    type="stepAfter"
                    dataKey={m.name}
                    stroke={m.color}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panelhead">
          <h2>Response time by process</h2>
        </div>
        <div className="chartbody">{bars(response)}</div>
      </section>
      <section className="panel">
        <div className="panelhead">
          <h2>Metric definitions</h2>
        </div>
        <div className="metricstable">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                {runs.map((r) => (
                  <th key={r.mode}>{r.mode}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {definitions.map(([key, title, def, unit]) => (
                <tr key={key}>
                  <td>
                    <b>{title}</b>
                    <small>{def}</small>
                  </td>
                  {runs.map((r) => {
                    const v = r.metrics[key];
                    return (
                      <td key={r.mode}>
                        {Array.isArray(v)
                          ? v.join(" → ")
                          : v === null
                            ? "Undefined"
                            : format(v) + " " + unit}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
