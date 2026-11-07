import { useLifecycle } from "../hooks/lifecycle";
import {
  GitBranch,
  ListTree,
  Timer,
  ChartGantt,
  Play,
  Pause,
  StepForward,
  RotateCcw,
} from "lucide-react";
import type { Config, Phase, Run } from "../engine/types";
import { stamp, type Player } from "../hooks/playback";
export const colors: Record<Phase, string> = {
  Queued: "#5a667b",
  Dispatching: "#3bc9db",
  Processing: "#8d87ff",
  Responding: "#49d4a5",
  Waiting: "#dda957",
};
export function Timeline({
  runs,
  config,
  player,
  inspect,
}: {
  runs: Run[];
  config: Config;
  player: Player;
  inspect: (id: string, mode: Run["mode"]) => void;
}) {
  const live = useLifecycle(runs, player.clock);
  const max = Math.max(1, ...runs.map((r) => r.metrics.total));
  return (
    <section className="panel timeline">
      <div className="panelhead">
        <h2>
          <ChartGantt /> Execution timeline
        </h2>
        <span title="Virtual playback clock" className="clock">
          <Timer size={14} />
          {stamp(player.clock)}
        </span>
      </div>
      <div className="legend">
        <b>Scheduled phases</b>
        {Object.entries(colors).map(([p, c]) => (
          <span key={p}>
            <i style={{ background: c }} />
            {p === "Dispatching"
              ? "Outbound"
              : p === "Responding"
                ? "Inbound"
                : p}
          </span>
        ))}
      </div>
      <div className={"lanes " + (runs.length === 1 ? "single" : "")}>
        {runs.map((run, idx) => (
          <div
            className={
              "lane " + (run.mode === "Synchronous" ? "sync" : "async")
            }
            key={run.mode}
          >
            <div className="lanehead">
              <span className="modeicon">
                {run.mode === "Synchronous" ? <ListTree /> : <GitBranch />}
              </span>
              <div>
                <h3>{run.mode}</h3>
                <small>
                  {run.mode === "Synchronous"
                    ? "Sequential · 1 slot"
                    : "Concurrent · " + config.concurrency + " slots"}
                </small>
              </div>
              <strong>{(run.metrics.total / 1000).toFixed(2)} s</strong>
            </div>
            <div className="plot">
              {config.processes.map((p) => {
                const rec = run.records.find((x) => x.id === p.id)!;
                return (
                  <button
                    key={p.id}
                    className="trackrow"
                    onClick={() => inspect(p.id, run.mode)}
                    aria-label={run.mode + " inspect " + p.id}
                  >
                    <b
                      title={
                        player.started
                          ? live[idx].get(p.id) || "Not arrived"
                          : p.name
                      }
                    >
                      {p.id}
                    </b>
                    <span className="track">
                      {run.intervals
                        .filter((x) => x.id === p.id)
                        .map((s, i) => (
                          <span
                            title={
                              s.phase + " · " + s.start + "–" + s.end + " ms"
                            }
                            key={i}
                            className={"segment " + s.phase}
                            style={{
                              left: (s.start / max) * 100 + "%",
                              width: ((s.end - s.start) / max) * 100 + "%",
                              background: colors[s.phase],
                              opacity:
                                player.started && s.start > player.clock
                                  ? 0.3
                                  : 1,
                            }}
                          />
                        ))}
                      <span
                        className={
                          "endmark " +
                          (rec.outcome === "Completed" ? "ok" : "bad")
                        }
                        title={rec.outcome + " · " + rec.end + " ms"}
                        aria-label={rec.outcome}
                        style={{
                          left: (rec.end / max) * 100 + "%",
                          opacity:
                            player.started && player.clock < rec.end ? 0.3 : 1,
                        }}
                      />
                      {player.started && (
                        <span
                          className="cursor"
                          style={{
                            left:
                              Math.min(100, (player.clock / max) * 100) + "%",
                          }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
              <div className="axis">
                <span>0 s</span>
                <span>{(max / 2000).toFixed(1)} s</span>
                <span>{(max / 1000).toFixed(1)} s</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="transport">
        <button className="primary" onClick={player.toggle}>
          {player.running ? <Pause /> : <Play />}
          {player.running
            ? "Pause"
            : !player.started
              ? "Run simulation"
              : player.clock >= player.end
                ? "Replay"
                : "Resume"}
        </button>
        <button
          onClick={player.step}
          disabled={player.started && player.clock >= player.end}
        >
          <StepForward /> Step
        </button>
        <button
          title="Reset playback"
          aria-label="Reset playback"
          onClick={player.reset}
        >
          <RotateCcw />
        </button>
        <label className="speed">
          Speed{" "}
          <select
            aria-label="Playback speed"
            value={player.speed}
            onChange={(e) => player.setSpeed(Number(e.target.value))}
          >
            {[0.5, 1, 2, 5].map((x) => (
              <option key={x} value={x}>
                {x}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
