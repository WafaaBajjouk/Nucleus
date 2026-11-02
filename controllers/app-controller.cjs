const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { handleInstanceRequest } = require('./instance-controller.cjs');
const { renderPage } = require('../views/page-renderer.cjs');

const routes = {
  '/': ['views/pages/index.html', 'text/html; charset=utf-8', true],
  '/index.html': ['views/pages/index.html', 'text/html; charset=utf-8', true],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/theme.js': ['theme.js', 'text/javascript; charset=utf-8'],
  '/add-project.html': [
    'views/pages/add-project.html',
    'text/html; charset=utf-8',
    true,
  ],
  '/graph.html': ['views/pages/graph.html', 'text/html; charset=utf-8', true],
  '/graph.js': ['graph.js', 'text/javascript; charset=utf-8'],
};

const browserModules = [
  'data/projects.js',
  'scripts/docker-readiness.js',
  'scripts/dashboard/projects.js',
  'scripts/dashboard/instances.js',
  'scripts/add-project.js',
  'scripts/sidebar-navigation.js',
  'scripts/graph/launch.js',
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

function createAppController({
  instances,
  getExamples,
  repositories,
  root = path.join(__dirname, '..'),
}) {
  return async function handleRequest(request, response) {
    if (await handleInstanceRequest(request, response, instances)) return;
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const json = (status, body) => {
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(
        request.method === 'HEAD' ? undefined : JSON.stringify(body),
      );
    };

    if (pathname === '/api/projects' && request.method === 'POST') {
      try {
        if (!isLocalRequest(request)) {
          json(403, { error: 'Use Nucleus from its local address.' });
          return;
        }
        if (
          request.headers['content-type']?.split(';')[0].trim() !==
          'application/json'
        ) {
          json(415, { error: 'Send application/json.' });
          return;
        }
        let text = '';
        for await (const chunk of request) {
          text += chunk;
          if (Buffer.byteLength(text) > 2048) {
            json(413, { error: 'Request is too large.' });
            return;
          }
        }
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          json(400, { error: 'Invalid JSON.' });
          return;
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          json(400, { error: 'Send a repository URL.' });
          return;
        }
        const project = await repositories.add(body.url);
        json(201, project);
      } catch (error) {
        if (!error.status)
          console.error('Could not import public repository:', error.message);
        json(error.status || 500, {
          error: error.status
            ? error.message
            : 'Could not import the public repository.',
        });
      }
      return;
    }
    if (pathname === '/api/projects') {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD, POST');
        json(405, { error: 'Method not allowed.' });
        return;
      }
      try {
        const [examples, imported] = await Promise.all([
          getExamples(),
          repositories.list(),
        ]);
        json(200, [...examples, ...imported]);
      } catch (error) {
        console.error('Could not load projects:', error.message);
        json(500, { error: 'Could not load local projects.' });
      }
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }

    const route = Object.hasOwn(routes, pathname) ? routes[pathname] : null;
    if (!route) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : 'Not found');
      return;
    }

    try {
      const [filename, contentType, isView] = route;
      const content = isView
        ? await renderPage(path.basename(filename))
        : await readFile(path.join(root, filename));
      response.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      console.error('Could not load dashboard asset:', error.message);
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(
        request.method === 'HEAD' ? undefined : 'Could not load file',
      );
    }
  };
}

function isLocalRequest(request) {
  let host;
  try {
    host = new URL(`http://${request.headers.host}`);
  } catch {
    return false;
  }
  return (
    ['localhost', '127.0.0.1'].includes(host.hostname) &&
    (!request.headers.origin || request.headers.origin === host.origin) &&
    request.headers['sec-fetch-site'] !== 'cross-site'
  );
}

module.exports = { createAppController };
