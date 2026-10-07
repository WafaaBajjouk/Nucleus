# Nucleus

**Launch. Monitor. Verify.**

A **self-hosted project catalogue**. Admins register containerised projects; users launch selected versions in isolated Docker Compose environments. The host needs Docker with Compose running and compatible container images.

## Use Cases

| Actor | Use cases |
|---|---|
| Admin | Register projects; configure images, dependencies, settings and checks; test and publish versions; archive projects; manage users, teams, ACLs and quotas. |
| User | Browse authorised projects; select a version; launch instances; open applications; start, stop, restart and delete owned instances; run verification. |
| Both | Monitor authorised instances: state, health, CPU/RAM, logs, deployment history and acceptance results. |
| System | Validate configuration; allocate ports; create networks and volumes; collect metrics; execute checks; record audit events; clean up failed deployments. |

**Access control:** RBAC defines admin/user roles. Project ACLs grant users or teams `view` and `launch`; instance ACLs grant `view`, `operate`, `verify` and `delete`. The backend checks permissions on every request. Data deletion is explicit.

```mermaid
flowchart LR
    A["Admin"] --> C["Configure Projects<br/>Versions · ACLs · Checks"]
    C --> CAT["Project Catalogue"]
    U["User"] --> CAT
    CAT --> L["Launch Isolated Instance"]
    L --> D["Dashboard<br/>Health · Resources · Logs · Results"]
    A --> D
    U --> D
```

## Advanced Use Case: Verify a New Version

Admin submits V2. Nucleus launches a disposable candidate, loads sample data and runs health checks plus acceptance tests. Passing verification enables publication; failure produces diagnostics. Existing V1 instances remain available. Live upgrades are outside scope.

```mermaid
flowchart LR
    A["Admin submits V2"] --> B["Deploy isolated candidate"]
    B --> C["Run verification"]
    C --> D{"Pass?"}
    D -->|Yes| E["Admin can publish V2"]
    D -->|No| F["Report failure"]
    E --> G["Clean up candidate"]
    F --> G
```
