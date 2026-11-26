# Changelog

## Unreleased

- Faster dashboard: the instance list no longer waits for `docker stats`
  (2.0–2.4 s → 0.35–0.6 s with 22 instances); one background call
  measures all running apps.

## 1.1.0

- Logs for a selected instance, or the output saved at a failed launch.
- Verify: Docker health plus an HTTP answer; result shown on the row.

## 1.0.0

- Stop and start a selected instance; start passes the health check again.
- Launch is safe to retry: a repeated `requestId` returns the first instance.
- CI on every pull request and push to `main` (Linux, Node from `.nvmrc`).
- Example base images pinned by digest.
- Architecture record (Checkpoint D), ADRs and a recovery runbook.

## 0.1.0 (6 Nov 2026)

- Browse bundled examples; import public GitHub repositories.
- Launch in an isolated Compose project on a random loopback port.
- Live state, health, CPU and memory read from Docker.
- "Ready" only after the health check passes (PR #1).
- Compose generated from a Dockerfile with one `EXPOSE` and a `HEALTHCHECK`.
