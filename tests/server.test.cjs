const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createHandler() {
  let handler;
  const context = {
    require(name) {
      if (name === 'node:http')
        return {
          createServer(callback) {
            handler = callback;
            return { on() {}, listen() {} };
          },
        };
      if (name === './services/examples.cjs')
        return require('../services/examples.cjs');
      return require(name);
    },
    process: { env: {} },
    __dirname: path.join(__dirname, '..'),
    Buffer,
    URL,
    console,
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8'),
    context,
  );
  return handler;
}
async function request(handler, url = '/api/examples', json = true) {
  const result = { headers: {} };
  await handler(
    { method: 'GET', url },
    {
      setHeader(key, value) {
        result.headers[key] = value;
      },
      writeHead(status, headers) {
        result.status = status;
        Object.assign(result.headers, headers);
      },
      end(body) {
        result.body = json ? JSON.parse(body) : body.toString();
      },
    },
  );
  return result;
}

test('example API lists exactly the local example folders', async () => {
  const result = await request(createHandler(), '/api/examples');
  const expected = fs
    .readdirSync(path.join(__dirname, '../examples'), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules',
    )
    .map((entry) => entry.name)
    .sort();
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.map((project) => project.name).sort(), expected);
  assert.ok(result.body.every((project) => project.source === 'example'));
});

test('dashboard renders a local catalogue without mock instances or activity', async () => {
  const result = await request(createHandler(), '/', false);
  assert.equal(result.status, 200);
  assert.match(result.body, /id="project-list"/);
  assert.match(result.body, /id="project-total"/);
  assert.doesNotMatch(
    result.body,
    /Storefront|Atlas API|Pulse Analytics|CPU usage|Memory usage|Verification passed|Jamie Davis/,
  );
  assert.doesNotMatch(result.body, /<!-- section:/);
});

test('graph renders the demo workspace without a remote connection form', async () => {
  const result = await request(createHandler(), '/graph.html', false);
  assert.equal(result.status, 200);
  assert.match(result.body, /Demo workspace/);
  assert.doesNotMatch(result.body, /github|username|token/i);
});

test('retired remote API and private configuration are not served', async () => {
  for (const url of [
    '/api/github/repos',
    '/data/config.js',
    '/.env',
    '/config/repositories.json',
  ]) {
    const result = await request(createHandler(), url, false);
    assert.equal(result.status, 404);
  }
});
