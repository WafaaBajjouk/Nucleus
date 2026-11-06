# UnitLab

A stateless distance converter for meters, kilometers, feet and miles.

- Local: `npm start`, then open http://localhost:3001.
- Test: `npm test`.
- Docker Compose: `docker compose up --build --wait`, then open
  http://localhost:8082. Stop with `docker compose down`.
- API: `/api/convert?value=1&from=km&to=m`. Health: `/health`.

Try 1 km -> meters (1000) and a negative value. Select UnitLab in the Nucleus
graph to launch it.
