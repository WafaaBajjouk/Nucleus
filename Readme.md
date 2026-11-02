# Nucleus

**Launch. Monitor. Verify.**

A **self-hosted project catalogue**. Admins register containerised projects; users launch selected versions in isolated Docker Compose environments. The host needs Docker with Compose running and compatible container images.


## Run locally

Requirements: Node.js 22.5+. Git is needed to import repositories. Docker with
Compose v2 is needed to launch apps.

```sh
npm install
npm start
```

## How it works

```mermaid
flowchart LR
    Browser["Dashboard and graph"] <-->|"HTTP API"| Nucleus["Nucleus server"]
    GitHub["Public GitHub"] -->|"Git clone"| Nucleus
    Nucleus --> Examples["Bundled examples and imported projects"]
    Nucleus -->|"Validate and launch"| Docker["Docker Compose"]
    Docker --> App["Running app"]
    Docker -->|"Instance status and resource usage"| Nucleus
```

Imported repositories need a supported root Compose file. Review repository
code before launching it; Nucleus rejects configurations outside its safety
checks. The dashboard reports Docker-provided instance status, health, CPU and
memory. No account is required.

Run checks with `npm test` and `npm run test:examples`.
