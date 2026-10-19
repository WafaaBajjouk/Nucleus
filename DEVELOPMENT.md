# Development

Run `npm start` with Node.js 22+. Open http://localhost:8000 or /graph.html. No build or runtime dependencies.

## Files

- `index.html`, `graph.html`: page layouts; the server fills HTML from `sections/`.
- `app.js`, `graph.js`: entry points; `scripts/`: separate instance and graph modules.
- `data/`: demo fixtures and default GitHub owner. `styles.css`: shared styles.
- `services/github.cjs`: fetches only configured repositories with the server token.
- `server.js`: serves pages and `GET /api/github/repos?username=…`.

## Repository access

Keep only `GITHUB_TOKEN` in ignored `.env`. Allowed names live in ignored `config/repositories.json`, a JSON array of `owner/repository` strings. Copy `config/repositories.example.json` for a new setup. List exactly the repositories selected for the token. Only entries matching the graph's owner are requested. No account-wide or public repository enumeration is used.

The server calls GitHub REST `GET /repos/{owner}/{repo}` for each entry using the token. GitHub's API does not expose the fine-grained token's selected-repository list, and public metadata is readable beyond that selection; the explicit list enforces what appears. Missing configuration or denied access never falls back to public imports. Responses use `Cache-Control: no-store`. Restart after changing `.env`.

The stack is plain JavaScript/HTML/CSS/SVG and Node.js built-ins. No database or Docker execution. Graph positions reset on reload.

## Checks and formatting

```sh
npm test
# Optional formatter installation:
npm install
npm run format
npm run format:check
```

Tests cover exact-list requests, owner filtering, missing configuration, denied access, and renamed repositories with mocked GitHub responses.

Manually check graph selection/dragging/reset and dashboard search/filters. Keep tokens out of logs, frontend files, and Git commits.
