# Viva questions and short answers

| Question                                                    | Answer                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| What does SyncLab compare?                                  | Two admission policies for the same set of simulated request-response processes.                                                              |
| What makes the synchronous policy blocking?                 | The caller waits for its current process's final success, failure or timeout before dispatching the next.                                     |
| How can asynchronous work overlap on one JavaScript thread? | Requests can be waiting for I/O at the same time. Continuations run when deliveries become available.                                         |
| How is parallelism different?                               | CPU parallelism requires simultaneous computation on separate execution resources. Overlapping request lifetimes alone do not demonstrate it. |
| Why use virtual time?                                       | It gives repeatable millisecond timestamps independent of browser timer precision or playback speed.                                          |
| How are ties handled?                                       | Equal event timestamps preserve deterministic insertion sequence. Ready-time ties use the original input order.                               |
| Why can P4 finish before P3 in the default workload?        | P4 gets a released slot at 840 ms and finishes at 1,440 ms. P3 remains in flight until 1,640 ms.                                              |
| What does a polling interval change?                        | It sets when the client can observe a ready response. A 40 ms result is detected at 50 ms with a 25 ms interval.                              |
| Can a successful server operation still time out?           | Yes. The deadline measures client delivery. A poll or queue notification can be too late even after transport arrival.                        |
| How are callbacks and direct delivery distinguished?        | A callback registers and later invokes a handler. Direct delivery resolves a blocked caller. Equal overhead can produce equal delivery time.  |
| What happens exactly at a deadline?                         | A response delivered at the deadline wins the tie and reports its actual success or failure.                                                  |
| Why label attempts?                                         | A response from attempt one may arrive during attempt two. The attempt tag prevents it from completing the wrong request.                     |
| How is throughput calculated?                               | Successful logical processes divided by workload time in seconds. A zero-length workload has undefined throughput.                            |
| What does waiting time include?                             | Initial admission delay, retry backoff and queueing, and post-transport waiting for delivery.                                                 |
| Why can the event log extend past workload completion?      | Expired replies are still observable. Workload completion uses the last logical terminal result.                                              |
| Are async and sync always equal with one slot?              | Successful requests with the same settings execute sequentially. Retries can reorder work because async releases its slot during backoff.     |
| Does async reduce communication volume?                     | In the default example both models consume 1,180 ms of aggregate wire time. Async overlaps portions of that time.                             |
| What happens when playback is paused?                       | The animation-frame loop stops. The virtual cursor stays fixed and the immutable trace remains available.                                     |
| Which files should you show during a demonstration?         | Start with the dashboard, use engine/schedule.ts to explain dispatch and show the schedule tests for the claimed behavior.                    |
| What limitation matters most for real-world interpretation? | The simulator assumes independent service capacity. Real contention and dependent operations can change the result.                           |
