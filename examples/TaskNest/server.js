const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createStore } = require('./store');

function createApp(
  directory = process.env.DATA_DIR || path.join(__dirname, 'data'),
) {
  const store = createStore(directory);
  const assets = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/app.js': ['app.js', 'text/javascript'],
    '/styles.css': ['styles.css', 'text/css'],
  };
  function json(response, status, data) {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(data));
  }
  async function body(request) {
    let text = '';
    for await (const chunk of request) {
      text += chunk;
      if (Buffer.byteLength(text) > 4096)
        throw Object.assign(Error('Request too large'), { status: 413 });
    }
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw Error();
      return data;
    } catch {
      throw Object.assign(Error('Invalid JSON'), { status: 400 });
    }
  }
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/health' && request.method === 'GET') {
        store.list(); // Readiness includes access to stored tasks.
        return json(response, 200, { status: 'ok', application: 'task-board' });
      }
      if (url.pathname === '/api/tasks') {
        if (request.method === 'GET') return json(response, 200, store.list());
        if (request.method === 'POST') {
          const data = await body(request);
          const title = typeof data.title === 'string' ? data.title.trim() : '';
          if (!title || title.length > 120)
            return json(response, 400, {
              error: 'Enter a task title between 1 and 120 characters.',
            });
          return json(response, 201, store.add(title));
        }
        return json(response, 405, { error: 'Method not allowed' });
      }
      const match = url.pathname.match(/^\/api\/tasks\/([a-f\d-]+)$/i);
      if (match) {
        if (request.method === 'PATCH') {
          const data = await body(request);
          if (typeof data.completed !== 'boolean')
            return json(response, 400, {
              error: 'completed must be true or false',
            });
          const task = store.complete(match[1], data.completed);
          return json(
            response,
            task ? 200 : 404,
            task || { error: 'Task not found' },
          );
        }
        if (request.method === 'DELETE') {
          const removed = store.remove(match[1]);
          return json(
            response,
            removed ? 200 : 404,
            removed ? { deleted: true } : { error: 'Task not found' },
          );
        }
        return json(response, 405, { error: 'Method not allowed' });
      }
      const asset = Object.hasOwn(assets, url.pathname)
        ? assets[url.pathname]
        : null;
      if (asset && request.method === 'GET') {
        const content = await fs.readFile(
          path.join(__dirname, 'public', asset[0]),
        );
        response.writeHead(200, {
          'Content-Type': asset[1],
          'X-Content-Type-Options': 'nosniff',
        });
        return response.end(content);
      }
      json(response, 404, { error: 'Not found' });
    } catch (error) {
      json(response, error.status || 500, {
        error: error.status
          ? error.message
          : 'Could not access application data.',
      });
    }
  });
}
if (require.main === module) {
  const app = createApp();
  app.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () =>
    console.log('Task Board is running'),
  );
  process.on('SIGTERM', () => app.close());
}
module.exports = { createApp };
