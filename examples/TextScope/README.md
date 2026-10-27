# TextScope

Analyze text to count words, characters, lines and paragraphs.

Requires Node.js 22+, with no dependencies, database, token or account.

Run `npm start`, then open http://localhost:3003. Tests: `npm test`.

With Docker Engine and Compose:

```sh
docker compose -p textscope up --build --wait
```

Open http://localhost:8084. Stop with `docker compose -p textscope down`.

API: `POST /api/run`, JSON body `{"text":"your document"}`. Health: `GET /health`.

Documents are processed in memory and limited to 64 KB. No authentication or saved history. Graph launching is not connected yet.
