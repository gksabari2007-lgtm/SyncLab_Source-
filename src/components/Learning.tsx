import { useEffect, useRef, useState } from "react";
import { BookOpen, Play } from "lucide-react";
export function Learning() {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function demo() {
    setBusy(true);
    setResult("Measuring three 120 ms timers…");
    const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 120));
    let start = performance.now();
    for (let i = 0; i < 3; i++) await wait();
    const sequential = performance.now() - start;
    if (!active.current) return;
    start = performance.now();
    await Promise.all([wait(), wait(), wait()]);
    if (active.current) {
      setResult(
        "Sequential await " +
          sequential.toFixed(1) +
          " ms · Concurrent promises " +
          (performance.now() - start).toFixed(1) +
          " ms",
      );
      setBusy(false);
    }
  }
  const topics = [
    [
      "Blocking and non-blocking",
      "A synchronous client dispatches one request and waits for its terminal result. An asynchronous client can dispatch another request while an earlier one is in flight. The concurrency limit bounds outstanding requests.",
    ],
    [
      "Concurrency and parallelism",
      "Overlapping requests can spend most of their time waiting on I/O. JavaScript can manage those requests on one event loop. CPU parallelism requires separate processing resources.",
    ],
    [
      "Latency and completion order",
      "Outbound and inbound delays consume time in both models. A short database lookup can finish before an earlier file upload if both are in flight. A concurrency limit of one removes most opportunities for overlap.",
    ],
    [
      "Response handling",
      "Direct delivery resolves a waiting caller. Callback delivery registers a handler and invokes it when the reply arrives. Polling checks on a fixed interval measured from dispatch. Event-queue delivery enqueues a notification and adds a configured delay.",
    ],
    [
      "Failures, deadlines and retries",
      "Each attempt gets a fresh timeout from dispatch. Delivery exactly at the deadline wins. A timed-out attempt cannot complete a process later. Async retries rejoin the ready queue after backoff. A synchronous client retains its turn through backoff.",
    ],
    [
      "Choosing a model",
      "Sequential calls suit dependent operations such as validating a login before loading private data. Concurrent requests suit independent file transfers or service lookups, but require correlation IDs and explicit error handling.",
    ],
    [
      "Simulation assumptions",
      "Durations are deterministic, integer milliseconds. Servers have independent processing capacity. Tasks do not share CPU cores or bandwidth. Virtual zero is the workload origin. Charted schedules are known before playback. Late notifications can extend playback past workload completion.",
    ],
  ];
  return (
    <>
      <section className="panel learn">
        <div className="panelhead">
          <h2>
            <BookOpen /> Request lifecycle
          </h2>
        </div>
        <div className="lifecycle">
          {["Arrival", "Outbound", "Processing", "Inbound", "Delivery"].map(
            (x, i) => (
              <span key={x}>
                <b>{i + 1}</b>
                {x}
              </span>
            ),
          )}
        </div>
        <p>
          Queue time runs from arrival to dispatch. Response time runs from
          arrival to final success, failure or timeout.
        </p>
      </section>
      <div className="learnitems">
        {topics.map(([t, p]) => (
          <article key={t}>
            <h3>{t}</h3>
            <p>{p}</p>
          </article>
        ))}
      </div>
      <section className="panel learn">
        <div className="panelhead">
          <h2>Live JavaScript demonstration</h2>
        </div>
        <p>
          Measure three real browser timers with sequential await and
          Promise.all. These wall-clock measurements depend on browser
          scheduling.
        </p>
        <div className="actions">
          <button className="primary" disabled={busy} onClick={demo}>
            <Play /> Measure timers
          </button>
          <output>{result}</output>
        </div>
      </section>
    </>
  );
}
