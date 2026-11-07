# Project overview

## Academic question

When identical requests execute under sequential and concurrent admission policies, how do latency, available slots and response detection change terminal time and order?

## Scope

SyncLab models independent service requests with configurable arrival, outbound, processing and inbound durations. Its two experiments share every input except admission and retry scheduling. The student controls the workload, inspects the resulting traces and exports data for analysis. An independent live timer exercise illustrates JavaScript's event loop.

| Learning objective      | Observable evidence                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Recognize blocking      | In the synchronous lane, each next dispatch follows the prior process's terminal event          |
| Recognize overlap       | Multiple async phase bars occupy the same virtual interval                                      |
| Explain ordering        | A process can finish before an earlier request. Its inspector gives dispatch and delivery times |
| Distinguish delay types | Wire legs, processing, initial queueing and delivery waiting are recorded separately            |
| Evaluate reliability    | A retry has its own attempt number. A late observation cannot overwrite a final outcome         |
| Make a fair comparison  | Both model calls consume the same validated process list and delivery settings                  |

## Demonstration sequence

1. Open Mixed Workload. Ask students to predict which of P3 and P4 finishes first in each model. Inspect the two traces and explain the difference.
2. Change concurrency to one. With no failures and the default mechanism the records coincide. Increase it back to three.
3. Select High Latency. Compare the sum of communication time to the workload finish. Several wire legs overlap in the async lane.
4. Switch to polling, increase its interval and inspect the last poll relative to transport arrival. Identify a change in the waiting metric.
5. Use Failure and Timeout Scenario. Inspect P1's successful retry, P3's expired attempts and P5's final failure. Filter the log by Late.
6. Export terminal records and events. Use the report's tables to compare with the reference configurations.

## Deliverables

The repository contains the complete frontend, TypeScript engine, automated tests, optional GitHub Pages workflow, real interface captures and supporting documentation. The deployment workflow runs only on manual invocation.
