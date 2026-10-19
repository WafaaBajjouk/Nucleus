const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { listRepositories } = require('./services/github.cjs');

// Serve only the dashboard assets, keeping repository files private.
const routes = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/graph.html': ['graph.html', 'text/html; charset=utf-8'],
  '/graph.js': ['graph.js', 'text/javascript; charset=utf-8'],
  '/sections/instances.js': [
    'sections/instances.js',
    'text/javascript; charset=utf-8',
  ],
};

// Explicit public browser modules; internal server files stay private.
const browserModules = [
  'data/instances.js',
  'data/projects.js',
  'data/config.js',
  'scripts/instances/render.js',
  'scripts/instances/controls.js',
  'scripts/graph/layout.js',
  'scripts/graph/selection.js',
  'scripts/graph/interactions.js',
  'scripts/graph/toolbar.js',
  'scripts/graph/import.js',
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
  'instances',
  'projects',
  'activity',
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
  if (pathname === '/api/github/repos') {
    response.setHeader('Cache-Control', 'no-store');
    if (!process.env.GITHUB_TOKEN?.trim()) {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(
        request.method === 'HEAD'
          ? undefined
          : JSON.stringify({ mode: 'demo' }),
      );
      return;
    }
    try {
      const username =
        new URL(request.url, 'http://localhost').searchParams.get('username') ||
        '';
      const repositories = await listRepositories(username);
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(
        request.method === 'HEAD' ? undefined : JSON.stringify(repositories),
      );
    } catch (error) {
      response.writeHead(error.status || 502, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(
        request.method === 'HEAD'
          ? undefined
          : JSON.stringify({
              error: error.status
                ? error.message
                : 'Could not reach GitHub. Check your connection and try again.',
            }),
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

server.listen(8000, '127.0.0.1', () => {
  console.log('Nucleus is running at http://localhost:8000');
  console.log('Press Ctrl+C to stop.');
});
