import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Search, X, ListChecks } from "lucide-react";
import type { Config, Event, Run } from "../engine/types";
import { stamp, type Player } from "../hooks/playback";
export function EventLog({
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
  const [filter, setFilter] = useState({
      id: "All",
      mode: "All",
      type: "All",
      status: "All",
    }),
    [limit, setLimit] = useState(50);
  const all = useMemo(
    () => runs.flatMap((r) => r.events).sort((a, b) => a.time - b.time),
    [runs],
  );
  const filtered = useMemo(
    () =>
      all.filter((e) =>
        (Object.keys(filter) as (keyof typeof filter)[]).every(
          (k) => filter[k] === "All" || filter[k] === e[k],
        ),
      ),
    [filter, all],
  );
  const options = useMemo(
    () => ({
      id: config.processes.map((p) => p.id),
      mode: runs.map((r) => r.mode),
      type: [...new Set(all.map((e) => e.type))],
      status: [...new Set(all.map((e) => e.status))],
    }),
    [config, runs, all],
  );
  let lo = 0,
    hi = filtered.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (filtered[mid].time <= player.clock) lo = mid + 1;
    else hi = mid;
  }
  const count = player.started ? lo : 0;
  return (
    <section className="panel">
      <div className="panelhead">
        <h2>
          <Terminal /> Event log
        </h2>
        <small>{count} events</small>
      </div>
      <div className="logfilters">
        {(Object.keys(options) as (keyof typeof options)[]).map((k) => (
          <label key={k}>
            {k === "id"
              ? "Process"
              : k === "mode"
                ? "Model"
                : k === "type"
                  ? "Event type"
                  : "Status"}
            <select
              value={filter[k]}
              onChange={(e) => {
                setFilter({ ...filter, [k]: e.target.value });
                setLimit(50);
              }}
            >
              <option>All</option>
              {options[k].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {count ? (
        <>
          <div className="eventlist">
            {filtered
              .slice(Math.max(0, count - limit), count)
              .reverse()
              .map((e) => (
                <button
                  key={e.mode + e.seq}
                  onClick={() => inspect(e.id, e.mode)}
                >
                  <code>{stamp(e.time)}</code>
                  <b>{e.id}</b>
                  <span
                    className={
                      e.mode === "Synchronous" ? "synctext" : "asynctext"
                    }
                  >
                    {e.mode === "Synchronous" ? "SYNC" : "ASYNC"}
                  </span>
                  <span>{e.message}</span>
                </button>
              ))}
          </div>
          {count > limit && (
            <button className="more" onClick={() => setLimit(limit + 100)}>
              Show earlier events
            </button>
          )}
        </>
      ) : (
        <p className="empty">
          <Search />
          {player.started
            ? "No events match these filters at this time."
            : "Run or step the simulation to see timestamped events."}
        </p>
      )}
    </section>
  );
}
export function Inspector({
  id,
  runs,
  initialMode,
  clock,
  started,
  close,
}: {
  id: string;
  runs: Run[];
  initialMode: Run["mode"];
  clock: number;
  started: boolean;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [mode, setMode] = useState(initialMode);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  const run = runs.find((r) => r.mode === mode)!,
    rec = run.records.find((r) => r.id === id)!;
  const [limit, setLimit] = useState(100);
  const events = run.events.filter((e) => e.id === id);
  const latest = started
    ? events.filter((e) => e.time <= clock && e.type !== "Late").at(-1)
    : undefined;
  const response =
    latest?.type === "Terminal"
      ? rec.outcome
      : latest?.type === "Enqueue"
        ? "Notification queued"
        : latest?.type === "Receive"
          ? "In delivery"
          : latest?.status === "Responding"
            ? "In transit"
            : latest?.type === "Retry"
              ? "Retry pending"
              : latest && latest.type !== "Arrival"
                ? "Awaiting reply"
                : "Pending dispatch";
  return (
    <dialog
      aria-label="Process inspector"
      className="editor"
      ref={dialog}
      onCancel={close}
    >
      <div className="panelhead">
        <h2>
          <ListChecks />
          {id} · {rec.name}
        </h2>
        <button aria-label="Close inspector" onClick={close}>
          <X />
        </button>
      </div>
      <div className="editorbody">
        <label>
          Scheduled lifecycle
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as typeof mode);
              setLimit(100);
            }}
          >
            {runs.map((r) => (
              <option key={r.mode}>{r.mode}</option>
            ))}
          </select>
        </label>
        <p>
          At {stamp(clock)} ·{" "}
          <b>{latest?.status ?? (started ? "Not arrived" : "Ready")}</b> ·
          Response state <b>{response}</b>
        </p>
        <p>
          Start <b>{rec.start} ms</b> · Finish <b>{rec.end} ms</b> · Response{" "}
          <b>{rec.response} ms</b> · {rec.outcome}
        </p>
        <div className="inspectlist">
          {events.slice(0, limit).map((e: Event) => (
            <div key={e.seq}>
              <code>{stamp(e.time)}</code>
              <small>A{e.attempt}</small>
              <span>{e.message}</span>
            </div>
          ))}
        </div>
        {events.length > limit && (
          <button onClick={() => setLimit(limit + 200)}>Show more</button>
        )}
      </div>
    </dialog>
  );
}
