const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { convert } = require('./convert');
const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript'],
  '/styles.css': ['styles.css', 'text/css'],
};
function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}
async function handleRequest(request, response) {
  if (request.method !== 'GET')
    return json(response, 405, { error: 'Method not allowed' });
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/health')
    return json(response, 200, { status: 'ok', application: 'unitlab' });
  if (url.pathname === '/api/convert') {
    try {
      const value = url.searchParams.get('value');
      if (!value?.trim()) throw Error('Enter a distance.');
      return json(
        response,
        200,
        convert(
          Number(value),
          url.searchParams.get('from'),
          url.searchParams.get('to'),
        ),
      );
    } catch (error) {
      return json(response, 400, { error: error.message });
    }
  }
  const asset = Object.hasOwn(assets, url.pathname)
    ? assets[url.pathname]
    : null;
  if (!asset) return json(response, 404, { error: 'Not found' });
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
  server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
    console.log('UnitLab is running on port ' + (process.env.PORT || 3001)),
  );
  process.on('SIGTERM', () => server.close());
}
module.exports = { handleRequest };
