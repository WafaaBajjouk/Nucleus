# ADR 0001: One Compose project per instance

**Status:** accepted (2 Nov 2026) · **Decider:** project owner

## Context
A developer may run the same project twice, for example to compare two
versions. Shared names, ports or volumes would let one instance overwrite or
answer for the other (Checkpoint C, risk 1).

## Decision
Each launch gets its own Compose project name (`nucleus-<uuid>`), its own
network and volumes, and a random host port on `127.0.0.1`.

## Consequences
- Instances cannot collide, and removal touches only one project.
- Several copies use more disk and memory.
- The port is not stable: it is read from Docker after every start.
