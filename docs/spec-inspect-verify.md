# Spec: inspect and verify an instance

## Logs

- `GET /api/instances/:id/logs` returns the last 200 lines from Docker for
  that instance only, capped at 64 KB.
- A failed launch, or Docker being unavailable, returns the output saved at
  launch (`error.log`), marked "Saved at launch".
- The dashboard shows them as text in a panel that stays open across
  refreshes.

## Verify

`POST /api/instances/:id/verify` runs the defined check. It passes only if
both parts pass:

1. **Docker health:** the app container is running and `healthy`.
2. **HTTP answer:** `GET /` on its local URL returns 2xx or 3xx within 5 s.

The result (each part, its detail, the time) is saved with the instance and
shown on its row. Stop or start clears it. Only a `ready` instance can be
verified (`409` otherwise).

## Checks

| Criterion | Test |
|---|---|
| Results come from the selected instance | `instances.test.cjs`: logs of the selected instance; verify probes its own URL |
| Pass and failure are visible | dashboard tests: logs panel; "Check failed" with each part |
| Failures are tested | HTTP 500, timeout, unhealthy, Docker down, failed launch |

**Live check (26 Nov 2026, Colima, Docker 29.5.2):** TextScope verified
(healthy, HTTP 200), its logs shown, verify refused while stopped, verified
again after start, then removed.
