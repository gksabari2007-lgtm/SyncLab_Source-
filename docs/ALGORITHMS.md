# Execution and accounting

## Admission and determinism

The virtual clock starts at 0. Inputs are immutable. Ready jobs are ordered by eligible time and then input position. A slot stores the virtual time at which its last attempt ended. Select the earliest available slot, breaking a tie by slot index. Dispatch at the larger of job eligibility and slot availability.

Synchronous mode has one slot and prioritizes the current process's retry until it reaches a final result. Async mode admits up to the configured capacity. A failed async attempt releases its slot, and any retry re-enters the ready list after backoff. With concurrency one and pending retries the two policies can therefore choose a different next process.

## Attempt timeline

For dispatch time D, outbound O, processing P, inbound I and delivery overhead H, processing begins at D + O. Transmission begins at D + O + P. The client transport receives the response at W = D + O + P + I. It becomes eligible for delivery at R = W + H.

| Mechanism   | Normal delivery time                            | Observable behavior                                                                               |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Direct      | R                                               | Caller enters an awaiting state at dispatch and receives the reply                                |
| Callback    | R                                               | Handler registers at dispatch and receives a completion notification                              |
| Polling     | D + interval × max(1, ceil((R − D) / interval)) | Every polling tick through termination produces a log event; the first tick is after one interval |
| Event queue | R + queue delay                                 | An enqueue event at R precedes delivery                                                           |

The deadline is D + timeout. A delivery exactly at the deadline succeeds or reports its injected failure. Otherwise a missed deadline ends the attempt at the deadline. A terminal success requires delivery and a successful response. The first-attempt failure option fails once, while always-fail affects every attempt. Injected failures travel through the same response channel as successes.

A retry produces an attempt outcome in the Retry event and waits for eligibility. Only the final attempt emits a logical Terminal event. A transport reply arriving after timeout produces a Late observation tagged with its original attempt. A queued or delayed callback/direct delivery that expires after transport arrival is also discarded. Polling stops at the deadline. Observation of a late response changes neither status nor metrics.

## Ties and intervals

Initial arrivals are inserted in input order. Each dispatched attempt inserts its local causal transitions in order, including zero-duration transitions. Returned events are sorted by (time, sequence). Simultaneous terminal records retain insertion order. In-flight intervals are half-open. An ending edge is processed before a starting edge at the same timestamp. Zero-length attempts have no positive-duration occupancy.

## Metrics

| Statistic                  | Definition                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Total workload time        | Maximum final terminal timestamp, measured from virtual zero                                                                |
| Response per process       | Final terminal time minus arrival time                                                                                      |
| Waiting per process        | Initial queueing, inter-attempt backoff and queueing, plus delivery waiting after transport arrival, summed across attempts |
| Average response / waiting | Sum over all logical processes divided by process count, including failed and timed-out processes                           |
| Throughput                 | Successful logical processes × 1000 / total ms; undefined when total is zero                                                |
| Communication delay        | Sum of consumed outbound and inbound portions, clipped at attempt termination                                               |
| Peak in flight             | Maximum simultaneous positive-duration dispatch-to-attempt-end intervals                                                    |
| Outcome counts             | Number of logical records in each terminal state                                                                            |
| Completion order           | IDs in chronological terminal order, including unsuccessful processes                                                       |
| Time difference            | Synchronous total minus asynchronous total; percentage uses synchronous total as denominator                                |

Processing duration is excluded from the waiting metric. Wire transmission is counted separately. Cumulative progress counts terminal logical processes of every outcome. The schedule can include idle time before arrivals, so makespan need not equal summed busy time.

## Worked trace

Two processes arrive at 0 with zero communication delay and processing times 100 and 40 ms. Direct synchronous delivery finishes at 100 and 140. With two async slots, completions occur at 40 and 100. The second process has zero initial waiting in async and 100 ms waiting in sync. If polling every 25 ms replaces direct delivery, the 40 ms reply becomes visible at 50 ms. The response waited 10 ms for detection.

## Playback

Before starting, the full computed schedule is shown with an idle clock. Step reveals the first event time and then each distinct higher timestamp. Frames move the cursor across an immutable trace. Pausing freezes the cursor. Rewinding clears exposed event history. Full result exports remain reproducible at every playback position.
