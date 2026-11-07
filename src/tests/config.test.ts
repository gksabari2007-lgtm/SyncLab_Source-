import { it, expect } from "vitest";
import { preset, decodeSaved, validate } from "../data/workloads";
const c = preset("Mixed Workload");
it("round trips a versioned configuration", () =>
  expect(decodeSaved(JSON.stringify({ version: 1, config: c }))).toEqual(c));
it.each([null, "{", "null", '{"version":2}', '{"version":1,"config":{}}'])(
  "rejects invalid save %s",
  (raw) => expect(() => decodeSaved(raw)).toThrow(),
);
it.each([
  { concurrency: 0 },
  { poll: 0 },
  { retries: 4 },
  { processes: [] },
  { timeout: NaN },
  { processes: [c.processes[0], c.processes[0]] },
  { processes: [{ ...c.processes[0], name: " " }] },
  { processes: [{ ...c.processes[0], duration: -1 }] },
  { processes: Array(21).fill(c.processes[0]) },
])("validates boundaries %#", (patch) =>
  expect(validate({ ...c, ...patch })).not.toBe(""),
);
