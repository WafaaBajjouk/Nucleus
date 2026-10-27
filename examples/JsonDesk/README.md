# JsonDesk

Validate and format JSON documents in a simple web editor.

Requires Node.js 22+, with no dependencies, database, token or account.

Run `npm start`, then open http://localhost:3002. Tests: `npm test`.

With Docker Engine and Compose:

```sh
docker compose -p jsondesk up --build --wait
```

Open http://localhost:8083. Stop with `docker compose -p jsondesk down`.

API: `POST /api/run`, JSON body `{"text":"your document"}`. Health: `GET /health`.

Documents are processed in memory and limited to 64 KB. No authentication or saved history. Graph launching is not connected yet.
