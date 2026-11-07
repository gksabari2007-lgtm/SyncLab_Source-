import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  Cpu,
  Download,
  FolderOpen,
  Layers3,
  LayoutDashboard,
  Menu,
  Radio,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Terminal,
  Workflow,
  X,
  ArrowUpRight,
  Boxes,
} from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { preset, presets, decodeSaved } from "./data/workloads";
import { simulate } from "./engine/schedule";
import type { Config, Run } from "./engine/types";
import { usePlayback, type Player } from "./hooks/playback";
import { Summary } from "./components/Summary";
import { useLifecycle } from "./hooks/lifecycle";
const Analytics = lazy(() =>
  import("./components/Analytics").then((m) => ({ default: m.Analytics })),
);
import { Editor } from "./components/Editor";
import { EventLog, Inspector } from "./components/Inspection";
import { Learning } from "./components/Learning";
import { Timeline } from "./components/Timeline";
const pages = [
  { id: "simulator", label: "Simulator", icon: LayoutDashboard },
  { id: "analytics", label: "Performance", icon: ChartNoAxesCombined },
  { id: "events", label: "Event log", icon: Terminal },
  { id: "guide", label: "How it works", icon: BookOpen },
];
const titles = [
  "Execution simulator",
  "Performance analysis",
  "Event log",
  "How it works",
];
const subtitles = [
  "Compare blocking and concurrent execution on a shared virtual clock.",
  "Inspect the calculated outcomes of both schedules.",
  "Follow timestamped events as the virtual clock advances.",
  "Explore the scheduling rules behind each simulation.",
];
const storageKey = "synclab.workload.v1";
function pageFromHash() {
  const hash = location.hash.slice(1);
  return pages.some((p) => p.id === hash) ? hash : "simulator";
}
function download(runs: Run[], config: Config, json: boolean) {
  const columns = [
    "id",
    "name",
    "arrival",
    "start",
    "end",
    "outcome",
    "response",
    "wait",
    "communication",
    "attempts",
  ] as const;
  function quote(value: unknown) {
    let s = String(value);
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }
  const data = json
    ? JSON.stringify(
        {
          version: 1,
          timeUnit: "virtual milliseconds",
          config,
          runs: runs.map((r) => ({
            mode: r.mode,
            events: r.events,
            metrics: r.metrics,
          })),
        },
        null,
        2,
      )
    : [
        ["mode", ...columns],
        ...runs.flatMap((r) =>
          r.records.map((p) => [r.mode, ...columns.map((c) => p[c])]),
        ),
      ]
        .map((row) => row.map(quote).join(","))
        .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([data], {
      type: json ? "application/json" : "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = json ? "synclab-events.json" : "synclab-results.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Workload({
  config,
  run,
  player,
  inspect,
}: {
  config: Config;
  run: Run;
  player: Player;
  inspect: (id: string) => void;
}) {
  const single = useMemo(() => [run], [run]);
  const [states] = useLifecycle(single, player.clock);
  return (
    <section className="panel workload">
      <div className="panelhead">
        <h2>
          <Boxes /> Process workload
        </h2>
        <small>{config.processes.length} processes</small>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {[
                "Process",
                "Outbound",
                "Processing",
                "Inbound",
                run.mode + " state",
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.processes.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <button className="rowlink" onClick={() => inspect(p.id)}>
                    <span className={"pid p" + (i % 5)}>{p.id}</span>
                    {p.name}
                    <ArrowUpRight size={13} />
                  </button>
                </td>
                <td>{p.outbound} ms</td>
                <td>{p.duration} ms</td>
                <td>{p.inbound} ms</td>
                <td>
                  <span className="statusdot" />
                  {player.started ? states.get(p.id) || "Not arrived" : "Ready"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default function App() {
  const [config, setConfig] = useState(() => preset("Mixed Workload")),
    [scenario, setScenario] = useState("Mixed Workload"),
    [page, setPage] = useState(pageFromHash),
    [view, setView] = useState("Compare both"),
    [mobile, setMobile] = useState(false),
    [editing, setEditing] = useState(false),
    [inspect, setInspect] = useState(""),
    [inspectMode, setInspectMode] = useState<Run["mode"]>("Asynchronous"),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const change = () => {
      setPage(pageFromHash());
      setMobile(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const runs = useMemo(
    () => [simulate(config, "Synchronous"), simulate(config, "Asynchronous")],
    [config],
  );
  const visible = useMemo(
    () =>
      view === "Compare both" ? runs : runs.filter((r) => r.mode === view),
    [view, runs],
  );
  const times = useMemo(
    () => visible.flatMap((r) => r.events.map((e) => e.time)),
    [visible],
  );
  const player = usePlayback(times);
  function apply(c: Config, label: string) {
    player.reset();
    setConfig(c);
    setScenario(label);
    setEditing(false);
    setInspect("");
    setNotice("");
  }
  function openInspector(id: string, mode: Run["mode"] = visible.at(-1)!.mode) {
    setInspectMode(mode);
    setInspect(id);
  }
  function save() {
    setMobile(false);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, config }));
      setNotice("Workload saved on this browser.");
    } catch {
      setNotice("Browser storage is unavailable.");
    }
  }
  function load() {
    setMobile(false);
    try {
      apply(decodeSaved(localStorage.getItem(storageKey)), "Saved workload");
      setNotice("Saved workload loaded.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const index = pages.findIndex((p) => p.id === page);
  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        {mobile && (
          <button
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className={mobile ? "sidebar open" : "sidebar"}>
          <a href="#simulator" className="brand">
            <img src="./mark.svg" alt="" />
            <span>
              Sync<span>Lab</span>
            </span>
          </a>
          <div className="sidecaption">WORKSPACE</div>
          <nav>
            {pages.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={"#" + id}
                aria-current={page === id ? "page" : undefined}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  location.hash = id;
                  setPage(id);
                  setMobile(false);
                  window.scrollTo(0, 0);
                }}
              >
                <Icon size={18} />
                {label}
              </a>
            ))}
          </nav>
          <div className="sidecaption">WORKLOAD</div>
          <div className="sidenav">
            <button onClick={save}>
              <Save /> Save configuration
            </button>
            <button onClick={load}>
              <FolderOpen /> Load configuration
            </button>
          </div>
          <div className="sidefoot">
            <Cpu />
            <div>
              <b>Simulation engine</b>
              <small>
                <i /> Local · deterministic
              </small>
            </div>
          </div>
        </aside>
        <main>
          <header>
            <button
              className="menubtn"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <Layers3 size={16} />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{pages[index].label}</b>
            <span className="enginebadge">
              <i /> Engine online
            </span>
          </header>
          <div className="content">
            <div className="pagehead">
              <div>
                <h1>{titles[index]}</h1>
                <p>{subtitles[index]}</p>
              </div>
              <button
                className="resetdefault"
                onClick={() => {
                  apply(preset("Mixed Workload"), "Mixed Workload");
                  setView("Compare both");
                  player.setSpeed(1);
                  setNotice("Default workload restored.");
                }}
              >
                <RotateCcw />
                Reset defaults
              </button>
            </div>
            {notice && (
              <div role="status" className="notice">
                {notice}
                <button
                  aria-label="Dismiss message"
                  onClick={() => setNotice("")}
                >
                  <X />
                </button>
              </div>
            )}
            <motion.div
              key={page}
              initial={{ opacity: 0.7, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="stack"
            >
              {page === "simulator" && (
                <>
                  <div className="configstrip">
                    <span className="configicon">
                      <SlidersHorizontal />
                    </span>
                    <label>
                      Scenario preset
                      <select
                        value={scenario}
                        onChange={(e) =>
                          apply(preset(e.target.value), e.target.value)
                        }
                      >
                        {!presets.some((x) => x === scenario) && (
                          <option>{scenario}</option>
                        )}
                        {presets.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Execution view
                      <select
                        value={view}
                        onChange={(e) => {
                          player.reset();
                          setView(e.target.value);
                        }}
                      >
                        {["Compare both", "Synchronous", "Asynchronous"].map(
                          (x) => (
                            <option key={x}>{x}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <button
                      className="configure"
                      onClick={() => setEditing(true)}
                    >
                      <SlidersHorizontal /> Configure
                    </button>
                  </div>
                  <Summary runs={runs} />
                  <Timeline
                    runs={visible}
                    config={config}
                    player={player}
                    inspect={openInspector}
                  />
                  <Workload
                    config={config}
                    run={visible.at(-1)!}
                    player={player}
                    inspect={openInspector}
                  />
                </>
              )}
              {page === "analytics" && (
                <>
                  <Suspense fallback={<p>Loading performance charts…</p>}>
                    <Analytics runs={runs} />
                  </Suspense>
                  <button
                    className="export"
                    onClick={() => download(runs, config, false)}
                  >
                    <Download /> Export results CSV
                  </button>
                </>
              )}
              {page === "events" && (
                <>
                  <div className="eventactions">
                    <button onClick={player.toggle}>
                      <Radio />
                      {player.running
                        ? "Pause"
                        : player.started && player.clock < player.end
                          ? "Resume"
                          : "Run simulation"}
                    </button>
                    <button
                      onClick={player.step}
                      disabled={player.started && player.clock >= player.end}
                    >
                      Step forward
                    </button>
                    <button
                      className="export"
                      onClick={() => download(runs, config, true)}
                    >
                      <Download /> Export full events JSON
                    </button>
                  </div>
                  <EventLog
                    config={config}
                    runs={visible}
                    player={player}
                    inspect={openInspector}
                  />
                </>
              )}
              {page === "guide" && <Learning />}
            </motion.div>
            <footer className="pagefoot">
              <Workflow /> SyncLab <span>Virtual time in milliseconds</span>
            </footer>
          </div>
        </main>
      </div>
      {editing && (
        <Editor
          config={config}
          close={() => setEditing(false)}
          apply={(c) => apply(c, "Custom workload")}
        />
      )}
      {inspect && (
        <Inspector
          id={inspect}
          runs={visible}
          initialMode={inspectMode}
          clock={player.clock}
          started={player.started}
          close={() => setInspect("")}
        />
      )}
    </MotionConfig>
  );
}
