# TextScope

Count words, characters, lines and paragraphs in text. Input is processed
in memory and limited to 64 KB.

- Local: `npm start`, then open http://localhost:3003.
- Test: `npm test`.
- Docker Compose: `docker compose up --build --wait`, then open
  http://localhost:8084. Stop with `docker compose down`.
- API: `POST /api/run` with `{"text":"your document"}`. Health: `/health`.

Select TextScope in the Nucleus graph to launch it.
