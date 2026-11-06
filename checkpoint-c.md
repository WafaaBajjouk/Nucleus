# Checkpoint C — Quality evidence and project record

## Priority risk

Unsupported Compose setup: the developer chooses a project that has no Compose file and loses time on a launch that can never work.

## Risk-control map

Actors: **Developer** (runs Nucleus), **Reviewer** (relies on the developer's result), **Host** (the developer's machine and its other services).

| # | Risk | Actors | Explanation | Likelihood · Impact | Control (type) | Cost | Residual risk |
|---|---|---|---|---|---|---|---|
| 1 | Name or port collision | Developer, Reviewer | Two instances share a name or port, so one overwrites or answers for the other. The result looks valid but is wrong. | Low · High | Unique Compose name and random loopback port per instance (prevent) | Low | Docker host problems can still block startup |
| 2 | Wrong project selected | Developer, Reviewer | The developer hovers one project while another is selected, and launches the wrong one. | Medium · High | Launch button names its target, e.g. "Launch JsonDesk" (prevent, **non-test: UI design**) | Low | The developer can still ignore the label |
| 3 | Unsupported or unsafe Compose setup | Developer, Host | An imported repository may have no Compose file, or need host access or several services. It fails late or touches the host. | High · Medium | Validate the Compose file before any container starts, plus a "review code before launch" notice (prevent, **non-test: human review**) | Low | Some valid layouts are rejected; the repository code itself is not inspected |
| 4 | False healthy state | Developer, Reviewer | A container is running but the app is not working, and Nucleus shows it as ready. | Medium · High | Require a healthcheck; ready only after it passes (detect) | Medium | A health check proves only what it tests |
| 5 | Stale instance | Developer, Host | An old instance stays visible or keeps using resources and is mistaken for a current one. | Medium · Medium | Remove instances with their volumes; dashboard checks Docker every 3 s (recover) | Low | Cleanup can fail if Docker is down |

## Quality story (risk 3): a project without a Compose file

- **Scenario:** the developer imports a GitHub repository that has a Dockerfile but no Compose file.
- **Why it matters:** many repositories have only a Dockerfile. Refusing them all made Nucleus useless for them.
- **Change:** Nucleus now generates the Compose file at launch. Nothing is guessed:
  - port: the Dockerfile's single `EXPOSE`;
  - health check: the Dockerfile's `HEALTHCHECK`;
  - no `HEALTHCHECK`, several ports, or neither file: refused at once with a reason.
- **Kept on purpose:** the generated file goes through the same Compose checks as a hand-written one. It is saved with the instance, never inside the repository.
- **Evidence:** 6 new tests (45/45 pass). Live check in Docker: a Dockerfile-only project reached up · healthy and answered on its port.
- **Limit:** a Dockerfile without a `HEALTHCHECK` is still refused. Repositories with no Dockerfile are not supported.
- **Next:** import a few real GitHub repositories and count how many qualify.

## Review and AI record

- **PR #1 (6 Nov 2026):** review found that risk 4 was not enforced. A project without a healthcheck was shown as ready.
- **Fix:** launch rejects a missing or disabled healthcheck before anything starts. The new test fails without the fix (39/39 pass with it).
- **Trade-off kept:** a healthcheck that exists only in the Dockerfile is not accepted.
- **AI use:** Claude (Claude Code) found the gap and wrote the fix, the tests and this record. I reviewed the diff, reran the tests and merged PR #1.

## Open unknowns

- Behaviour on Linux and Windows Docker hosts is untested.
- Imported repository code runs in Docker without a code scan.

## Definition of Done

A change is done when:
- the selected project is valid and has a healthcheck;
- the instance is isolated and Docker reports it healthy;
- it can be removed without affecting other instances;
- **each risk control has a test that fails if the control is removed** (new rule, from PR #1).
