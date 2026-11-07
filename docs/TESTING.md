# Verification record

## Reproduce locally

Use Node.js 22.12 or later. Install dependencies in the project root, run the deterministic tests, then build the production bundle.

```sh
npm install
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

The final command serves the already built site on a free loopback port, launches Chromium, runs the flow, then closes browser and server. Set CHROMIUM_PATH to use a system Chromium executable, or SYNCLAB_TEST_URL to target an existing local server. CAPTURE_SCREENSHOTS=1 writes fresh PNG captures to docs/screenshots.

## Executed automated checks

| Suite             | Tests | Coverage                                                                                                                                                                                 |
| ----------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schedule.test.ts  |    28 | Sequencing, overlap, peak concurrency, arrivals, ties, completion ordering, communication, response mechanisms, deadlines, retry bounds, failures, determinism, immutability and metrics |
| config.test.ts    |    15 | Valid save roundtrip, corrupt JSON, version handling, bad types, names, range and process-count validation                                                                               |
| playback.test.tsx |     4 | Pause, resume, reset, speeds, end clamping, grouped steps and delayed initial arrivals                                                                                                   |
| editor.test.tsx   |     2 | Bulk generation to 20 processes, invalid draft, commit, duplicate, delete and one-process minimum                                                                                        |

The 49 tests passed using Vitest and React Testing Library. The production build includes strict TypeScript checking. No performance claim uses browser animation speed.

## Browser integration

The standalone Playwright runner could not launch its own Chromium process in this workspace because the process singleton socket was denied. The equivalent interactions below were exercised through the available managed Chromium browser using Playwright locators and assertions.

- Opened the dashboard, inspected the shared-scale timeline and opened an asynchronous process lifecycle.
- Generated 20 processes, reduced to three, edited a name, duplicated and deleted a process, added another process and rejected a negative processing time.
- Applied a four-process polling configuration, saved it, switched presets, then reloaded the edited configuration.
- Stepped, ran, paused, checked the frozen time, changed speed to 5×, resumed and reached Replay.
- Filtered by process, model and poll event. Verified a JSON download with two model traces and a CSV download with eight process records plus its header.
- Verified three Recharts chart containers and ran the real Promise timer exercise.
- Checked horizontal overflow and keyboard navigation at 320, 390 and 768 px viewport widths. Fixed a narrow-screen grid overflow and rechecked the dimensions. Checked the mobile performance view separately.

The screenshots in docs/screenshots were captured from the working application. The phone image is cropped to its responsive viewport. Windows and GitHub Pages publication were not exercised in this workspace.

## Interpreting the tests

The scheduler tests use small exact workloads that can be calculated by hand. The capacity test inspects every integer time in several staggered 20-process schedules. The retry tests verify both per-attempt events and one logical terminal result. The playback tests advance a controlled clock, and the configuration tests validate persisted data independently of browser storage.
