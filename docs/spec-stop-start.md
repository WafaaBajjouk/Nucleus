# Spec: stop and start an instance

**Increment:** "Control an instance" from [Checkpoint B](../checkpoint-b.md).

## Behaviour

- **Stop:** `POST /api/instances/:id/stop` runs `compose stop`. The
  container and its volume are kept; the record becomes `stopped`.
- **Start:** `POST /api/instances/:id/start` runs `compose up --no-build
  --no-recreate --wait`. It is `ready` only after the health check passes.
  The host port is read again, because Docker may assign a new one.
- **Failed start:** the instance is stopped again and the reason is shown.
  It never looks usable while unhealthy.

## Rules

- Only the selected Compose project is touched.
- One operation at a time per instance; a second gets `409`.
- Failed launches cannot be stopped or started (`409`).
- Requests must be local JSON, like a launch.

## Checks

| Criterion (Checkpoint B) | Test |
|---|---|
| Only that instance is affected | `instances.test.cjs`: stop and start act on the selected instance only |
| Displayed state matches Docker | dashboard test: Stop/Start buttons and "Stopped" label |
| Errors are visible | `instances.test.cjs`: failed start is stopped again and reported |

**Live check (26 Nov 2026, Colima, Docker 29.5.2):** TaskNest launched
healthy (HTTP 200), stopped (Docker: exited, volume kept), started again
healthy on a new port (HTTP 200), then removed with its volume.
