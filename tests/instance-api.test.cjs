const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const {
  handleInstanceRequest,
} = require('../controllers/instance-controller.cjs');

async function request({
  method = 'POST',
  url = '/api/instances',
  body = '{"projectId":"example:TaskNest"}',
  headers = {},
  manager = {},
} = {}) {
  const input = Readable.from(body === null ? [] : [body]);
  Object.assign(input, {
    method,
    url,
    headers: {
      host: 'localhost:8000',
      origin: 'http://localhost:8000',
      'content-type': 'application/json',
      ...headers,
    },
  });
  const result = { headers: {} };
  result.handled = await handleInstanceRequest(
    input,
    {
      setHeader(name, value) {
        result.headers[name] = value;
      },
      writeHead(status, headers) {
        result.status = status;
        Object.assign(result.headers, headers);
      },
      end(body) {
        result.body = body ? JSON.parse(body) : undefined;
      },
    },
    manager,
  );
  return result;
}

test('local JSON launch returns an asynchronous instance record', async () => {
  let projectId;
  const response = await request({
    manager: {
      async launch(id) {
        projectId = id;
        return { id: 'nucleus-id', status: 'starting' };
      },
    },
  });
  assert.equal(response.status, 202);
  assert.equal(projectId, 'example:TaskNest');
  assert.equal(response.body.status, 'starting');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('engine readiness is available through the local API', async () => {
  const response = await request({
    method: 'GET',
    url: '/api/engine',
    body: null,
    manager: {
      async engineStatus() {
        return { ready: false, message: 'Start Docker, then check again.' };
      },
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    ready: false,
    message: 'Start Docker, then check again.',
  });
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('cross-origin and malformed requests cannot launch containers', async () => {
  for (const [headers, expected] of [
    [{ origin: 'https://external.example' }, 403],
    [{ host: 'external.example', origin: 'http://external.example' }, 403],
    [{ 'sec-fetch-site': 'cross-site' }, 403],
    [{ 'content-type': 'text/plain' }, 415],
  ]) {
    assert.equal((await request({ headers })).status, expected);
  }
  for (const [body, expected] of [
    ['{', 400],
    ['null', 400],
    ['{}', 400],
    ['x'.repeat(1025), 413],
  ]) {
    assert.equal((await request({ body })).status, expected);
  }
});

test('instance reads and deletes dispatch to the manager', async () => {
  const id = 'nucleus-11111111-1111-4111-8111-111111111111';
  const manager = {
    async list() {
      return [{ id, runtimeStatus: 'up' }];
    },
    async remove(value) {
      assert.equal(value, id);
    },
  };
  assert.deepEqual(
    (await request({ method: 'GET', body: null, manager })).body,
    [{ id, runtimeStatus: 'up' }],
  );
  const deleted = await request({
    method: 'DELETE',
    url: `/api/instances/${id}`,
    body: null,
    manager,
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(deleted.body, { removed: true });
  assert.equal(
    (
      await request({
        method: 'DELETE',
        url: '/api/instances/not-an-id',
        body: null,
        manager,
      })
    ).status,
    404,
  );
});
