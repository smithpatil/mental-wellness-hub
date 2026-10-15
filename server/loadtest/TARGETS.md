# Load-test targets (fixed before the load test was run)

Recorded: 2026-10-14, before any load-test run.

| Measure | Target |
|---|---|
| p95 latency, ordinary API requests, at 200 concurrent users | <= 500 ms |
| p95 latency, recommendation requests, at 200 concurrent users | <= 1000 ms |
| Error rate (non-2xx responses or timeouts) at 200 concurrent users | < 1 % |

Design: closed-loop virtual users, think time ~1 s, 30 s per level, 70 % ordinary API reads / 30 % recommendation
requests, levels 50 / 100 / 200. All components (Express API, in-memory MongoDB, one uvicorn NLP worker, load
generator) share a single laptop. Rate limits are raised for the run because every virtual user shares one IP.
Results are therefore indicative of a single-node deployment only, not of production capacity.

## Outcome (added after the runs; targets above were not changed)

- First build, 1 NLP worker (`results/load_v1_1worker.json`): recommend p95 1642 ms at 100 users and 4773 ms at 200 users, so the 1000 ms target was missed.
- After pinning one torch thread per worker and 3 workers (`results/load_v2_3workers.json`): at 200 users API p95 363 ms, recommend p95 346 ms, error rate 0.62 % (18 timeouts in 2910 requests); all three targets met on this machine.
