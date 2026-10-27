# Development

Run `npm start` with Node.js 22+. Open http://localhost:8000 or /graph.html.

Both pages use `GET /api/examples`. Add or remove a project folder in `examples/` and refresh. Names come from folders; version/description come from each project's `package.json`. Compose counts mean a file exists, not that deployment has succeeded.

The Demo workspace includes TaskNest, UnitLab, JsonDesk and TextScope. No applications start automatically. See [EVALUATION.md](EVALUATION.md). TaskNest task data are excluded from Git.

## Files

- `index.html`, `graph.html`: page layouts assembled from `sections/`.
- `app.js`, `scripts/dashboard/projects.js`: local project cards, search and counts.
- `graph.js`, `scripts/graph/`: graph layout, dragging, selection, details and source loading.
- `data/projects.js`: shared examples loader.
- `services/examples.cjs`: reads the local project catalogue.
- `server.js`: local HTTP server; `styles.css`: shared layout and styles.

The interface uses the included **Demo workspace**. No account or token is needed.

## Checks

```sh
npm test
npm run test:examples
npm run format
npm run format:check
```

Formatting requires `npm install` once. Tests use Node's built-in runner. Override `PORT` if the default 8000 is occupied.

Check project search, empty/error states, graph selection, focus details, dragging and reset. Changes to server code require restarting; browser files require a refresh.

There are no fabricated dashboard metrics or activity records. Nucleus does not yet launch or monitor instances. A configured Compose file is only preparation for the next deployment increment.
