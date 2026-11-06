# TaskNest

A single-user task list. Add, complete, reopen and delete tasks; saved tasks
survive restarts.

- Local: `npm start`, then open http://localhost:3000.
- Test: `npm test`.
- Docker Compose: `docker compose up --build --wait`, then open
  http://localhost:8081. Stop with `docker compose down`.

Compose data survives `down`; `docker compose down -v` deletes it. Select
TaskNest in the Nucleus graph to launch an isolated instance.
