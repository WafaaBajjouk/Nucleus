# ADR 0004: Generate Compose only from declared facts

**Status:** accepted (6 Nov 2026) · **Decider:** project owner

## Context
Many repositories have a Dockerfile but no Compose file. Refusing them all
made Nucleus useless for them (Checkpoint C, risk 3).

## Decision
Nucleus generates a Compose file only when the Dockerfile declares exactly one
`EXPOSE` port and a `HEALTHCHECK`. Nothing is guessed. The generated file is
stored with the instance, never in the repository, and validated like any
other Compose file.

## Consequences
- Dockerfile-only projects can launch with the same safety rules.
- Projects with several ports or no health check are refused with a reason.
