import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Editor } from "../components/Editor";
import { preset } from "../data/workloads";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
it("generates 20 unique editable processes, validates input, and applies a draft", () => {
  const apply = vi.fn(),
    initial = preset("Mixed Workload");
  render(<Editor config={initial} apply={apply} close={() => {}} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Process count" }), {
    target: { value: 20 },
  });
  expect(
    (screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "P20" }));
  const field = screen.getByRole("spinbutton", { name: "Processing (ms)" });
  fireEvent.change(field, { target: { value: -1 } });
  expect(screen.getByRole("alert").textContent).toContain("duration");
  expect(
    (
      screen.getByRole("button", {
        name: "Apply workload",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(field, { target: { value: 123 } });
  fireEvent.click(screen.getByRole("button", { name: "Apply workload" }));
  const output = apply.mock.calls[0][0];
  expect(output.processes).toHaveLength(20);
  expect(output.processes[19].duration).toBe(123);
  expect(initial.processes).toHaveLength(5);
});
it("preserves at least one process and correctly duplicates and deletes a selection", () => {
  const apply = vi.fn();
  render(
    <Editor config={preset("Mixed Workload")} apply={apply} close={() => {}} />,
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Process count" }), {
    target: { value: 1 },
  });
  expect(
    (screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply workload" }));
  expect(apply.mock.calls[0][0].processes).toEqual([
    preset("Mixed Workload").processes[0],
  ]);
});
