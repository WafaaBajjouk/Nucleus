# Checkpoint B — Lifecycle and specification

## Lifecycle choice

Nucleus uses an iterative and incremental lifecycle: deliver a usable
capability, check it, then use the results to choose or adjust the next
increment. This fits the uncertainty around Docker setup and the different
Compose structures of imported projects.

## Increments

| Increment | Status and usable result | Completion criteria |
|---|---|---|
| Browse projects | Implemented: developers can browse bundled examples and imported repositories. | Projects appear in the catalogue and can be selected. |
| Launch a project | Implemented: a supported project runs in an isolated Compose instance. | Unsupported setup is rejected; each instance has its own project name and loopback port; Docker reports its status and health; removal works. |
| Control an instance | Planned: developers can stop and restart a selected instance. | Only that instance is affected, displayed state matches Docker, and errors are visible. |
| Inspect and verify | Planned: developers can inspect an instance's logs and run a defined check. | Results come from the selected instance; pass and failure are visible and tested. |

These are separate increments: the first two describe existing behaviour; the
last two are plans, not implemented or tested features.

## Checks and feedback

For each planned increment, run automated tests for normal requests, invalid
requests, Docker errors and cleanup. When Docker is available, also run a local
Compose demonstration and record its steps, result and limitations. Ask a
developer to try the workflow and record their feedback; one person's feedback
will not prove general usability.

To investigate whether Nucleus reduces setup work, compare manual setup with
Nucleus on the same machine, project and operator. Alternate the order, record
steps, elapsed time and failures for three attempts each, and report the small
sample without claiming improvement before collecting results.

## Decision

The next increment is stop/restart controls. Review its test and demonstration
results before deciding whether to proceed to logs and verification. User
accounts, permissions and continuous monitoring are outside the current scope.
