# UnitLab

A distance converter with a real API: meters, kilometers, feet and miles. Plain JavaScript and Node.js; no dependencies, database, account or token.

With Node.js 22+, run `npm start`, then open http://localhost:3001.

Tests: `npm test`. Try 1 km → meters (1000), 1 mile → meters (1609.344), and an invalid negative distance.

With Docker Engine and Compose:

```sh
docker compose -p unitlab up --build --wait
```

Open http://localhost:8082. Stop with `docker compose -p unitlab down`.

API: `/api/convert?value=1&from=km&to=m`. Health: `/health`.

This stateless example complements TaskNest's persistent storage. Launching from Nucleus's graph is not connected yet.
