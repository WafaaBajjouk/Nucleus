# Running the dashboard

This first increment is a static dashboard built with HTML, CSS, and plain JavaScript (no TypeScript). It has no build step or runtime package dependencies.

Install Node.js (version 22 or newer). From the repository root, run:

```sh
npm start
```

Open http://localhost:8000. Stop the server with Ctrl+C.

No `npm install` or build step is needed to run the dashboard. The JavaScript server uses only Node.js built-in modules. You can also start it directly with `node server.js`.

## File organisation

`index.html` and `graph.html` contain the page layouts. Each `<!-- section:name -->` marker is replaced by the matching HTML file in `sections/` by the Node.js server. To edit one section, open its file, such as `sections/stats.html`, `sections/projects.html`, or `sections/graph-canvas.html`. Reload the browser after saving; no build is needed.

`app.js` starts the dashboard, and `sections/instances.js` connects its instance modules. Sample data lives in `data/`. Table rendering and search/filter controls have separate files in `scripts/instances/`. `graph.js` starts the graph; layout/edges, project selection, dragging/keyboard interactions, and toolbar controls each have a file in `scripts/graph/`. Shared styling remains in `styles.css`.

Run pages through `npm start` so the server can assemble their sections.

## Formatting commands

With Node.js and npm installed, install the development tools and format the code:

```sh
npm install
npm run format
```

Use `npm run format:check` to check formatting without changing files. The project uses Prettier with two-space indentation and single quotes in JavaScript. Your existing `Readme.md` notes are excluded from formatting.

In VS Code, install the recommended **Prettier – Code formatter** extension to enable the workspace's format-on-save settings for JavaScript, HTML, CSS, and JSON.

The dashboard contains project cards, four sample instances, summary metrics, and activity. Open Project graph from the sidebar or visit http://localhost:8000/graph.html. This separate page contains only the graph and its controls. Drag workspace, project, and service nodes using a mouse or touch; connections follow. Select a project to see its services and version. Tab focuses nodes, arrow keys move them, and Shift increases the step. Reset layout restores positions. Positions are kept while switching projects on the page and reset on reload. Graph lines represent workspace membership and project/service inclusion, not service-to-service dependencies. The graph uses plain JavaScript, HTML, and SVG with no graph library. Search matches instance and project names; status filters combine with search. Press `/` to focus the search field. Layouts support desktop and mobile screens; the graph scrolls horizontally on narrow screens.

All counts, resource usage, verification results, identity, and activity are fixtures. The local environment badge describes the intended deployment target, not a live connection. There is no authentication, permission enforcement, Docker connection, or instance operation in this increment. The catalogue preview shows three of six sample projects.

## Manual checks

- Confirm all four instances appear initially.
- Select Running (three results), then Stopped (one result).
- Search for `storefront` with All instances selected (two results).
- Combine Stopped with `storefront` (empty state), then clear search.
- Use the sidebar links and Explore projects to navigate within the page.
- Select each project in the graph: Storefront shows 3 services, Atlas API shows 2, and Pulse Analytics shows 4. Confirm the selected node, lines, and details update. Selection also works with Tab and Enter or Space.
- Check keyboard focus, horizontal table scrolling, and the layout at narrow widths.

The optional Google Fonts stylesheet falls back to system sans-serif fonts when offline.

Next increments can add a full project catalogue, a backend data model and API, and permission-checked Docker Compose lifecycle operations.
