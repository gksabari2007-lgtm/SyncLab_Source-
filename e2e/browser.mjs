import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const server = process.env.SYNCLAB_TEST_URL
  ? null
  : await preview({ preview: { host: "127.0.0.1", port: 0 } });
const url =
  process.env.SYNCLAB_TEST_URL ||
  "http://127.0.0.1:" + server.httpServer.address().port;
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.getByRole("heading", { name: "Execution simulator" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const shot = async (name) => {
    if (process.env.CAPTURE_SCREENSHOTS === "1")
      await page.screenshot({
        path: "docs/screenshots/" + name + ".png",
        fullPage: true,
      });
  };
  await shot("desktop");
  await page
    .getByRole("button", { name: "Asynchronous inspect P2", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Scheduled lifecycle", exact: true })
      .inputValue(),
    "Asynchronous",
  );
  await page.getByRole("button", { name: "Close inspector" }).click();
  await page.getByRole("button", { name: "Configure", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Process count", exact: true })
    .selectOption("20");
  await page
    .getByRole("combobox", { name: "Process count", exact: true })
    .selectOption("3");
  await page.getByLabel("Process name").fill("Student login");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Processing (ms)", { exact: true }).fill("-1");
  assert.equal(
    await page.getByRole("button", { name: "Apply workload" }).isEnabled(),
    false,
  );
  await page.getByLabel("Processing (ms)", { exact: true }).fill("180");
  await page
    .getByRole("combobox", { name: "Response mechanism", exact: true })
    .selectOption("Polling");
  await page.getByLabel("Polling interval (ms)").fill("100");
  await page.getByRole("button", { name: "Apply workload" }).click();
  assert.equal(await page.locator(".workload tbody tr").count(), 4);
  await page.getByRole("button", { name: "Save configuration" }).click();
  await page
    .getByRole("combobox", { name: "Scenario preset", exact: true })
    .selectOption("Failure and Timeout Scenario");
  await page.getByRole("button", { name: "Load configuration" }).click();
  await page.getByRole("button", { name: "P1 Student login" }).waitFor();
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const clock = await page.locator(".clock").innerText();
  await page.waitForTimeout(90);
  assert.equal(await page.locator(".clock").innerText(), clock);
  await page
    .getByRole("combobox", { name: "Playback speed", exact: true })
    .selectOption("5");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).waitFor();
  await page.getByRole("link", { name: "Event log", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Event type", exact: true })
    .selectOption("Poll");
  await page
    .getByRole("combobox", { name: "Process", exact: true })
    .selectOption("P1");
  await page
    .getByRole("combobox", { name: "Model", exact: true })
    .selectOption("Asynchronous");
  assert.ok((await page.locator(".eventlist button").count()) > 0);
  assert.ok(
    (await page.locator(".eventlist button").first().innerText()).includes(
      "P1",
    ),
  );
  async function exported(button) {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: button }).click(),
    ]);
    return readFile(await download.path(), "utf8");
  }
  const json = JSON.parse(await exported("Export full events JSON"));
  assert.equal(json.runs.length, 2);
  assert.ok(json.runs[0].events.some((e) => e.type === "Poll"));
  await page.getByRole("link", { name: "Performance", exact: true }).click();
  await page.getByRole("heading", { name: "Metric definitions" }).waitFor();
  const csv = await exported("Export results CSV");
  assert.equal(csv.split("\r\n").length, 9);
  assert.ok(csv.includes("Student login"));
  assert.equal(await page.locator(".recharts-wrapper").count(), 3);
  await shot("performance");
  await page.getByRole("link", { name: "How it works" }).click();
  await page.getByRole("button", { name: "Measure timers" }).click();
  await page.getByText(/Sequential await .*Concurrent promises/).waitFor();
  await page.getByRole("link", { name: "Simulator", exact: true }).click();
  await page.getByRole("button", { name: "Reset defaults" }).click();
  assert.equal(await page.locator(".workload tbody tr").count(), 5);
  assert.equal(await page.locator(".clock").innerText(), "00:00.000");
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Horizontal overflow at " + width,
    );
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "How it works" }).click();
    await page.getByRole("heading", { name: "How it works" }).waitFor();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Simulator", exact: true }).click();
    if (width === 390) await shot("mobile");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop editor, schedule inspection, playback, storage, filters, CSV/JSON, charts, Promise demo, tablet and mobile layouts. No uncaught page errors.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.httpServer.close(resolve));
}
