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

test('stop and start dispatch to the manager and require local JSON', async () => {
  const id = 'nucleus-11111111-1111-4111-8111-111111111111';
  const seen = [];
  const manager = {
    async stop(value) {
      seen.push(['stop', value]);
      return { id: value, status: 'stopped' };
    },
    async start(value) {
      seen.push(['start', value]);
      return { id: value, status: 'ready' };
    },
  };
  for (const action of ['stop', 'start']) {
    const result = await request({
      url: `/api/instances/${id}/${action}`,
      body: '{}',
      manager,
    });
    assert.equal(result.status, 200);
  }
  assert.deepEqual(seen, [
    ['stop', id],
    ['start', id],
  ]);
  const plain = await request({
    url: `/api/instances/${id}/stop`,
    headers: { 'content-type': 'text/plain' },
    manager,
  });
  assert.equal(plain.status, 415);
  const foreign = await request({
    url: `/api/instances/${id}/stop`,
    headers: { origin: 'https://example.com' },
    manager,
  });
  assert.equal(foreign.status, 403);
  const unknown = await request({ url: '/api/instances/bad/stop', manager });
  assert.equal(unknown.status, 404);
  assert.equal(seen.length, 2);
});

test('logs are read through the local API only', async () => {
  const id = 'nucleus-11111111-1111-4111-8111-111111111111';
  const manager = {
    async logs(value) {
      return { id: value, source: 'docker', truncated: false, text: 'ready' };
    },
  };
  const ok = await request({
    method: 'GET',
    url: `/api/instances/${id}/logs`,
    body: null,
    manager,
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.text, 'ready');
  const foreign = await request({
    method: 'GET',
    url: `/api/instances/${id}/logs`,
    body: null,
    headers: { 'sec-fetch-site': 'cross-site' },
    manager,
  });
  assert.equal(foreign.status, 403);
  const post = await request({ url: `/api/instances/${id}/logs`, manager });
  assert.equal(post.status, 405);
  assert.equal(post.headers.Allow, 'GET, HEAD');
});
