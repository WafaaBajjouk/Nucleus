# Development

Run `npm start` with Node.js 22+. Open http://localhost:8000 or /graph.html.

Both pages use `GET /api/examples` by default, regardless of GitHub configuration. Add or remove a project folder in `examples/` and refresh. Names come from folders; version/description come from each project's `package.json`. Compose counts mean a file exists, not that deployment has succeeded.

## Files

- `index.html`, `graph.html`: page layouts assembled from `sections/`.
- `app.js`, `scripts/dashboard/projects.js`: local project cards, search and counts.
- `graph.js`, `scripts/graph/`: graph layout, dragging, selection, details and source loading.
- `data/projects.js`: shared examples loader; `data/config.js`: optional GitHub username.
- `services/examples.cjs`: reads the local project catalogue.
- `services/github.cjs`: reads configured repositories using a server-side token.
- `server.js`: local HTTP server; `styles.css`: shared layout and styles.

GitHub is opt-in under **GitHub (optional)** on the graph. Keep `GITHUB_TOKEN` in ignored `.env` and selected `owner/repository` names in ignored `config/repositories.json`. Only listed, token-accessible repos are loaded. **Local projects** switches back to examples. No token is required for local projects.

## Checks

```sh
npm test
npm run format
npm run format:check
```

Formatting requires `npm install` once. Tests use Node's built-in runner. Override `PORT` if the default 8000 is occupied.

Check project search, empty/error states, graph selection, focus details, dragging and reset. Changes to server code require restarting; browser files require a refresh.

There are no fabricated dashboard metrics or activity records. Nucleus does not yet launch or monitor instances. A configured Compose file is only preparation for the next deployment increment.
