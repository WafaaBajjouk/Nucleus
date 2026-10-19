# Development

Run `npm start` with Node.js 22+. Open http://localhost:8000 or /graph.html. No build or runtime dependencies.

## Files

- `index.html`, `graph.html`: page layouts; the server fills section markers.
- `sections/`: separate HTML sections and instance initialisation.
- `app.js`, `graph.js`: page entry points.
- `scripts/instances/`: table rendering and search/filter controls.
- `scripts/graph/`: layout, selection, dragging, toolbar, and GitHub import.
- `data/`: demo fixtures; `styles.css`: shared styles.
- `data/config.js`: default GitHub username loaded automatically when the graph opens.
- `services/github.cjs`: fetches public repositories from GitHub, including pagination.
- `server.js`: serves pages/assets and `GET /api/github/repos?username=…`.

The stack is plain JavaScript/HTML/CSS/SVG plus Node.js built-ins. The GitHub REST API needs internet access but no credentials. No database, Docker execution, or private-repository support yet. Imported graphs reset on reload.

## Optional formatting

```sh
npm install
npm run format
npm run format:check
```

## Quick checks

- Dashboard: search for storefront, switch status filters, and check empty results.
- Graph: import a public username, select and drag repositories, reset layout, then restore demos.
- Check unknown usernames, accounts with no public repositories, and rate-limit/network errors. Failed imports keep the current graph.
- Try keyboard movement and touch dragging. Restart the server after changing server code; reload for browser changes.
