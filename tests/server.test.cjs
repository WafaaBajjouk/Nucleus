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
async function request(handler) {
  const result = { headers: {} };
  await handler(
    { method: 'GET', url: '/api/github/repos?username=alice' },
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
