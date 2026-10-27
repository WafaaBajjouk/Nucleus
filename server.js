const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { listExamples } = require('./services/examples.cjs');

// Serve only the dashboard assets, keeping repository files private.
const routes = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/theme.js': ['theme.js', 'text/javascript; charset=utf-8'],
  '/graph.html': ['graph.html', 'text/html; charset=utf-8'],
  '/graph.js': ['graph.js', 'text/javascript; charset=utf-8'],
};

// Explicit public browser modules; internal server files stay private.
const browserModules = [
  'data/projects.js',
  'scripts/dashboard/projects.js',
  'scripts/graph/layout.js',
  'scripts/graph/selection.js',
  'scripts/graph/interactions.js',
  'scripts/graph/toolbar.js',
  'scripts/graph/import.js',
  'scripts/graph/details.js',
];
for (const filename of browserModules) {
  routes[`/${filename}`] = [filename, 'text/javascript; charset=utf-8'];
}

// These local templates are assembled before sending the page to the browser.
const sections = new Set([
  'sidebar',
  'header',
  'heading',
  'notice',
  'stats',
  'projects',
  'footer',
  'graph-toolbar',
  'graph-canvas',
]);

async function renderPage(filename) {
  const template = await readFile(path.join(__dirname, filename), 'utf8');
  const markers = [...template.matchAll(/<!-- section:([a-z-]+) -->/g)];
  const contents = await Promise.all(
    markers.map(async ([, name]) => {
      if (!sections.has(name)) throw new Error(`Unknown section: ${name}`);
      return readFile(path.join(__dirname, 'sections', `${name}.html`), 'utf8');
    }),
  );
  let index = 0;
  return Buffer.from(
    template.replace(/<!-- section:([a-z-]+) -->/g, () => contents[index++]),
  );
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/api/examples') {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const projects = await listExamples();
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(
        request.method === 'HEAD' ? undefined : JSON.stringify(projects),
      );
    } catch {
      response.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(
        request.method === 'HEAD'
          ? undefined
          : JSON.stringify({ error: 'Could not load local example projects.' }),
      );
    }
    return;
  }
  const route = Object.hasOwn(routes, pathname) ? routes[pathname] : null;

  if (!route) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : 'Not found');
    return;
  }

  try {
    const [filename, contentType] = route;
    const content = filename.endsWith('.html')
      ? await renderPage(filename)
      : await readFile(path.join(__dirname, filename));
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error('Could not load dashboard asset:', error.message);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : 'Could not load file');
  }
});

server.on('error', (error) => {
  console.error(`Could not start Nucleus: ${error.message}`);
  process.exitCode = 1;
});

const port = Number(process.env.PORT || 8000);
server.listen(port, '127.0.0.1', () => {
  console.log(`Nucleus is running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});
