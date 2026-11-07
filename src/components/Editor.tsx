import { useRef, useState, useEffect } from "react";
import { X, Plus, Copy, Trash2, SlidersHorizontal } from "lucide-react";
import { limits, newProcess, validate } from "../data/workloads";
import type { Config, Process } from "../engine/types";
const labels = {
  arrival: "Arrival",
  outbound: "Outbound",
  duration: "Processing",
  inbound: "Inbound",
  concurrency: "Concurrency limit",
  overhead: "Delivery overhead",
  timeout: "Request timeout",
  retries: "Retry count",
  backoff: "Retry backoff",
  poll: "Polling interval",
  queue: "Queue delivery delay",
};
type NumberKey = keyof typeof limits;
function NumberField({
  field,
  value,
  onChange,
}: {
  field: NumberKey;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label>
      {labels[field]}
      {!["concurrency", "retries"].includes(field) && " (ms)"}
      <input
        type="number"
        min={limits[field][0]}
        max={limits[field][1]}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </label>
  );
}
export function Editor({
  config,
  apply,
  close,
}: {
  config: Config;
  apply: (c: Config) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState<Config>(() => structuredClone(config)),
    [selected, select] = useState(config.processes[0].id);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  const p = draft.processes.find((p) => p.id === selected)!;
  const error = validate(draft);
  function patch(changes: Partial<Process>) {
    setDraft({
      ...draft,
      processes: draft.processes.map((item) =>
        item.id === selected ? { ...item, ...changes } : item,
      ),
    });
  }
  function add(duplicate = false) {
    let i = 1;
    while (draft.processes.some((p) => p.id === "P" + i)) i++;
    const item = duplicate
      ? { ...p, id: "P" + i, name: p.name.slice(0, 57) + " (copy)" }
      : newProcess(i);
    setDraft({ ...draft, processes: [...draft.processes, item] });
    select(item.id);
  }
  function resize(count: number) {
    const processes = draft.processes.slice(0, count);
    let id = 1;
    while (processes.length < count) {
      while (processes.some((item) => item.id === "P" + id)) id++;
      processes.push(newProcess(id));
    }
    if (!processes.some((item) => item.id === selected))
      select(processes[0].id);
    setDraft({ ...draft, processes });
  }
  return (
    <dialog
      aria-label="Workload configuration"
      ref={dialog}
      onCancel={close}
      className="editor"
    >
      <div className="panelhead">
        <h2>
          <SlidersHorizontal /> Workload configuration
        </h2>
        <button aria-label="Close editor" onClick={close}>
          <X />
        </button>
      </div>
      <div className="editorbody">
        <div className="countrow">
          <h3>Processes</h3>
          <label>
            Process count
            <select
              value={draft.processes.length}
              onChange={(e) => resize(Number(e.target.value))}
            >
              {Array.from({ length: 20 }, (_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="chips">
          {draft.processes.map((item) => (
            <button
              key={item.id}
              className={item.id === selected ? "selected" : ""}
              onClick={() => select(item.id)}
            >
              {item.id}
            </button>
          ))}
          <button disabled={draft.processes.length >= 20} onClick={() => add()}>
            <Plus size={15} /> Add
          </button>
        </div>
        <div className="fields">
          <label className="wide">
            Process name
            <input
              value={p.name}
              maxLength={64}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          {(["arrival", "duration", "outbound", "inbound"] as const).map(
            (k) => (
              <NumberField
                key={k}
                field={k}
                value={p[k]}
                onChange={(n) => patch({ [k]: n })}
              />
            ),
          )}
          <label>
            Inject failure
            <select
              value={p.failure}
              onChange={(e) =>
                patch({ failure: e.target.value as Process["failure"] })
              }
            >
              {["Never", "First attempt", "Always"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button
            disabled={draft.processes.length >= 20}
            onClick={() => add(true)}
          >
            <Copy /> Duplicate
          </button>
          <button
            disabled={draft.processes.length === 1}
            onClick={() => {
              const processes = draft.processes.filter((x) => x.id !== p.id);
              select(processes[0].id);
              setDraft({ ...draft, processes });
            }}
          >
            <Trash2 /> Delete
          </button>
        </div>
        <h3>Scheduling & delivery</h3>
        <div className="fields">
          <label>
            Response mechanism
            <select
              value={draft.mechanism}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  mechanism: e.target.value as Config["mechanism"],
                })
              }
            >
              {["Direct", "Callback", "Polling", "Event queue"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {(
            [
              "concurrency",
              "overhead",
              "timeout",
              "retries",
              "backoff",
              ...(draft.mechanism === "Polling" ? ["poll" as const] : []),
              ...(draft.mechanism === "Event queue" ? ["queue" as const] : []),
            ] as const
          ).map((k) => (
            <NumberField
              key={k}
              field={k}
              value={draft[k]}
              onChange={(n) => setDraft({ ...draft, [k]: n })}
            />
          ))}
        </div>
      </div>
      <footer>
        {error && <span role="alert">{error}</span>}
        <button onClick={close}>Cancel</button>
        <button
          className="primary"
          disabled={!!error}
          onClick={() => apply(draft)}
        >
          Apply workload
        </button>
      </footer>
    </dialog>
  );
}
