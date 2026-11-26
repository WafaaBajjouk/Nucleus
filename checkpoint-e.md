# Checkpoint E — Reproducible environments, CI/CD and release

Done = shown, with where to check. Planned = not done yet.

## Q1. Reproducible environments

**Run:** `cd project && npm install && npm start`, open localhost:8000.

| Input | Declared in |
|---|---|
| Node 22 (`>=22.5`) | `project/.nvmrc`, `package.json` engines |
| Packages: none from outside | `package.json`, lockfile |
| Settings: `PORT` (default 8000); `NUCLEUS_DOCKER_PATH` (optional) | `server.js`, `services/instances.cjs` |
| Base image `node:22-alpine@sha256:1314fb…` | `examples/*/Dockerfile`, guarded by a test |
| Output identity: the git commit or tag (no build step) | `git log`, `v1.0.0` |

**Done (26 Nov):**
- Clean run on Linux from `git archive`, Node 22.23.5: 53/53 and 11/11 tests.
- Same tests on macOS, Node 26.12.
- Example built from the pinned digest (Colima, Docker 29.5.2).

**Planned:** Nucleus itself in a container; a run by another person on
their machine; Windows.

## Q2. CI/CD as process and technology

| Step | Who | Rule |
|---|---|---|
| Integrate | me | one change, one branch, one PR ([template](.github/pull_request_template.md)) |
| Review | me, AI use disclosed | read the diff, rerun tests, note findings in the PR |
| Failure | me | red CI is fixed before merge |
| Release | me | tag only from green `main` after a live launch |

**Technology:** [CI workflow](.github/workflows/ci.yml) on every PR and push
to `main`: Linux, Node from `.nvmrc`, `npm ci`, both test suites,
read-only, no secrets, no deploy.

**Done:** workflow, template; the same steps passed locally on Linux.
**Planned:** first green run on GitHub; branch protection making CI required
(a workflow alone does not block a merge, L18).

## Q3. Feature release strategy

- **Reaches users:** a developer pulls a tag (`v1.0.0`), notes in the
  [changelog](CHANGELOG.md). I decide; no public deployment.
- **Exposure:** opt-in by pulling; each feature on its own branch and PR.
- **Signal:** "ready" only after the health check passes, also after a
  restart ([ADR 0003](docs/adr/0003-ready-means-health-check-passed.md)).
- **Recovery:** check out the previous tag; stop, start or remove one
  instance ([runbook](docs/runbook.md)). Old records still load (contract
  test).

Controls match the risk: one local user, so no canary or feature flags.

**Live checks (26 Nov, Colima):** TaskNest launched, stopped, started on a
new port, healthy, HTTP 200, removed. JsonDesk launched twice with one
`requestId`: one instance, healthy, HTTP 200, removed.

**Planned:** the `v1.0.0` tag itself, after CI is green on `main`.
