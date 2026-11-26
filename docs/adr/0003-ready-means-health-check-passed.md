# ADR 0003: "Ready" means the health check passed

**Status:** accepted (6 Nov 2026, PR #1) · **Decider:** project owner

## Context
A running container is not a working app. Without a health check,
`compose up --wait` returns as soon as the container starts (Checkpoint C,
risk 4).

## Decision
A project must declare a health check. Nucleus refuses it before any
container starts if not. Launch and start both use `up --wait`, so an
instance is `ready` only after its health check passes.

## Consequences
- Some real projects are refused until they add a `HEALTHCHECK`.
- A health check proves only what it tests; a weak check can still pass.
