# JsonDesk

Validate and format JSON in a browser editor. Input is processed in memory
and limited to 64 KB.

- Local: `npm start`, then open http://localhost:3002.
- Test: `npm test`.
- Docker Compose: `docker compose up --build --wait`, then open
  http://localhost:8083. Stop with `docker compose down`.
- API: `POST /api/run` with `{"text":"your document"}`. Health: `/health`.

Select JsonDesk in the Nucleus graph to launch it.
