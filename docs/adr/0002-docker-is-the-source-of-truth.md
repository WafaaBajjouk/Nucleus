# ADR 0002: Docker decides runtime state

**Status:** accepted (2 Nov 2026) · **Decider:** project owner

## Context
Nucleus keeps a record per instance (`.nucleus/instances/<id>/instance.json`).
A container can stop, crash or be removed outside Nucleus, so the record can
be stale.

## Decision
The record stores intent and history (what was launched, last message, URL).
The live state shown to the user (up, down, health) is read from
`docker compose ps` on every refresh. If Docker cannot answer, the dashboard
shows "Unknown", never the record's last state.

## Consequences
- The dashboard does not claim "up" for a container that is gone.
- The "Open app" link is shown only while Docker reports the app up.
- Each refresh costs one Docker call per instance.
