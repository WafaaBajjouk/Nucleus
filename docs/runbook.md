# Recovery runbook

| Problem | What you see | Do this |
|---|---|---|
| Port 8000 busy | `Could not start Nucleus` | `PORT=8001 npm start` |
| Docker not running | Dashboard: engine not reachable | Start Docker (Colima: `colima start`), then **Check again** |
| Launch failed | Instance **Failed** with a reason | Open **Logs** (saved launch output), fix the project, **Remove**, launch again |
| App up but not working | **Verify** shows a failed part | Open **Logs**; fix the app, then **Stop**, **Start** and **Verify** again |
| Cleanup needed | "Cleanup failed; remove this instance…" | Start Docker, then **Remove** |
| Start failed | "Start failed: the health check did not pass" | The app was stopped again. Check the app, then **Start** or **Remove** |
| Nucleus crashed during a launch | **Unknown** or **Starting** that never ends | Restart Nucleus; the state comes from Docker. **Remove** if needed |
| Bad release | Tests or the app fail after an update | `git checkout v<previous>`, `npm test`, `npm start`. Old records still load |

## Update a pinned image

```sh
docker pull node:22-alpine
docker image inspect node:22-alpine --format '{{index .RepoDigests 0}}'
```

Replace the digest in each `project/examples/*/Dockerfile`, run `npm test`,
launch one example, and record it in the changelog.
