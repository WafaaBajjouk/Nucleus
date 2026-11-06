# Checkpoint C — Quality evidence and project record

## Priority risk

The highest-priority risk is: naming or port collision, where one instance interferes with another and creates misleading output.

## Risk-control map

| # | Risk | Why it matters | Control | Cost | Example | Residual risk |
|---|---|---|---|---|---|---|
| 1 | Name or port collision | One instance can interfere with another and make the user think the wrong app is running | Unique Compose name and loopback port per instance | Low | Two instances both try to use port 8000 or share the same project name | Host Docker issues can still block startup |
| 2 | Wrong project selected | The user may test the wrong app even when the launch flow appears successful | Keep project identity explicit in the launch request and display it back to the user before launch | Low | User selects TaskNest in the graph, but the dashboard later shows a different target instance | Some imported projects may still be rejected |
| 3 | Unsupported Compose setup | The app may fail before it even starts, wasting time and creating confusion | Validate the Compose file before launch | Low | A repo with no root compose file or broken YAML is rejected before startup | Some unusual valid layouts may be excluded |
| 4 | False healthy state | The app may be shown as ready even though it is not working | Require Docker status and health before marking ready | Medium | Docker says the container exists, but the health endpoint is not ready | Health does not prove full correctness |
| 5 | Stale instance confusion | Old instances can remain visible and mislead later testing | Remove instances as part of the flow and refresh dashboard state | Low | An old instance remains visible after shutdown | Cleanup may fail under Docker issues |

## Quality story

This risk was prioritized because it is the most damaging failure in the local workflow: the developer may believe they are testing the correct app while actually running the wrong target, a broken container, or a stale environment. The chosen control is worth its cost because it blocks the failure early and prevents wasted debugging time. The relevant evidence is the launch tests and the live TaskNest demo showing a healthy instance and clean removal.

## Review and AI record

During review, the launch flow was corrected to validate supported projects and reserve a unique project name and port before startup. This was a documented decision, not just approval. AI assistance was used only to refine reasoning and documentation; the student verified the final claims and evidence.

## Definition of Done

A task is complete only when the selected project is valid, the instance is isolated, Docker reports it healthy, and the instance can be removed without affecting other local instances.
