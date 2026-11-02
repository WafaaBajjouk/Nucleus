## Project Claim

Nucleus aims to automate local deployment for developers in companies and teams. Developers select a project from an interactive graph and launch it in an isolated Docker Compose environment, reducing manual setup.

## Current State

The catalogue, graph, Compose launch, launch health check, instance listing/status and deletion are implemented. Multi-user permissions and ongoing monitoring and verification are not.

## Proposed Software Development Lifecycle

I will use an **iterative and incremental lifecycle**, defining, implementing and testing each usable capability before using evidence and feedback to plan the next step.

### Planned Increments

1. **Add instance controls and permissions:** Start, stop and restart instances, with access limited to authorised users. Complete when permitted actions work and instance states update correctly.
2. **Add monitoring and verification:** Show instance logs and run health and acceptance checks. Complete when results reflect real instances and are clearly reported.

### Planned Testing and Feedback

After each increment, I will test its expected behaviour, permissions and error handling, and record results. I will compare the steps and time for manual and Nucleus setup under comparable conditions, then use test results and user feedback to decide what to improve. These evaluations are planned
