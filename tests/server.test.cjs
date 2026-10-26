const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createHandler(token, listRepositories) {
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
      if (name === './services/github.cjs') return { listRepositories };
      if (name === './services/examples.cjs')
        return require('../services/examples.cjs');
      return require(name);
    },
    process: { env: { GITHUB_TOKEN: token }, loadEnvFile() {} },
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
async function request(handler, url = '/api/github/repos?username=alice') {
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
        result.body = JSON.parse(body);
      },
    },
  );
  return result;
}

test('example API lists exactly the local example folders', async () => {
  const result = await request(
    createHandler('', () => {
      throw Error('Unexpected GitHub call');
    }),
    '/api/examples',
  );
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
  assert.ok(result.body.every((project) => project.services.length === 0));
});

test('absent, empty, and whitespace tokens select demos without fetching GitHub', async () => {
  for (const token of [undefined, '', '   ']) {
    const result = await request(
      createHandler(token, () => {
        throw Error('Unexpected GitHub call');
      }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, 'demo');
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
});
test('configured token loads real repositories', async () => {
  const result = await request(
    createHandler('test-token', async () => [{ name: 'selected' }]),
  );
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, [{ name: 'selected' }]);
});
test('invalid configured token stays an error instead of silently selecting demos', async () => {
  const result = await request(
    createHandler('bad-token', async () => {
      throw Object.assign(new Error('Token invalid'), { status: 401 });
    }),
  );
  assert.equal(result.status, 401);
  assert.equal(result.body.error, 'Token invalid');
  assert.equal(result.body.mode, undefined);
});
