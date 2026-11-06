const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { run } = require('./tool');
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
async function handleRequest(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/health' && request.method === 'GET')
    return json(response, 200, { status: 'ok', application: 'jsondesk' });
  if (pathname === '/api/run') {
    if (request.method !== 'POST')
      return json(response, 405, { error: 'Method not allowed' });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk);
        if (size > 65536) {
          const error = Error('Document exceeds 64 KB.');
          error.status = 413;
          throw error;
        }
        chunks.push(Buffer.from(chunk));
      }
      let data;
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw Error('Invalid request JSON.');
      }
      return json(response, 200, run(data?.text));
    } catch (error) {
      return json(response, error.status || 400, { error: error.message });
    }
  }
  const asset = Object.hasOwn(assets, pathname) ? assets[pathname] : null;
  if (!asset) return json(response, 404, { error: 'Not found' });
  if (request.method !== 'GET')
    return json(response, 405, { error: 'Method not allowed' });
  try {
    const content = await fs.readFile(path.join(__dirname, 'public', asset[0]));
    response.writeHead(200, {
      'Content-Type': asset[1],
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
  } catch {
    json(response, 500, { error: 'Could not load application.' });
  }
}
if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(Number(process.env.PORT || 3002), '0.0.0.0', () =>
    console.log('JsonDesk is running on port ' + (process.env.PORT || 3002)),
  );
  process.on('SIGTERM', () => server.close());
}
module.exports = { handleRequest };
