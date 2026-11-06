const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createAppController } = require('../controllers/app-controller.cjs');
const { listExamples } = require('../models/example-catalogue.cjs');

function createHandler({
  repositories = { add: async () => {}, list: async () => [] },
} = {}) {
  return createAppController({
    getExamples: listExamples,
    instances: {
      engineStatus: async () => ({ ready: true }),
      list: async () => [],
      launch: async () => ({ id: 'nucleus-test', status: 'starting' }),
      remove: async () => {},
    },
    repositories,
    root: path.join(__dirname, '..'),
  });
}
async function request(
  handler,
  url = '/api/projects',
  json = true,
  { method = 'GET', body, headers = {} } = {},
) {
  const result = { headers: {} };
  await handler(
    {
      method,
      url,
      headers: {
        host: 'localhost:8000',
        origin: 'http://localhost:8000',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      async *[Symbol.asyncIterator]() {
        if (body !== undefined) yield body;
      },
    },
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

test('project API combines bundled examples and imported public repositories', async () => {
  const imported = {
    id: 'repository:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'team-service',
    source: 'github',
  };
  const result = await request(
    createHandler({ repositories: { list: async () => [imported] } }),
    '/api/projects',
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
  assert.deepEqual(
    result.body.map((project) => project.name).sort(),
    [...expected, imported.name].sort(),
  );
  assert.equal(
    result.body.filter((project) => project.source === 'example').length,
    expected.length,
  );
  assert.ok(result.body.some((project) => project.id === imported.id));
});

test('public repository import validates local requests and returns the project', async () => {
  let addedUrl;
  const handler = createHandler({
    repositories: {
      async add(url) {
        addedUrl = url;
        return { id: 'repository:id', name: 'team-service', source: 'github' };
      },
      list: async () => [],
    },
  });
  const result = await request(handler, '/api/projects', true, {
    method: 'POST',
    body: JSON.stringify({ url: 'https://github.com/acme/team-service' }),
  });
  assert.equal(result.status, 201);
  assert.equal(addedUrl, 'https://github.com/acme/team-service');
  assert.equal(result.body.name, 'team-service');

  const blocked = await request(handler, '/api/projects', true, {
    method: 'POST',
    body: JSON.stringify({ url: 'https://github.com/acme/team-service' }),
    headers: { origin: 'https://external.example' },
  });
  assert.equal(blocked.status, 403);
});

test('dashboard renders a local catalogue without mock instances or activity', async () => {
  const result = await request(createHandler(), '/', false);
  assert.equal(result.status, 200);
  assert.match(result.body, /id="project-list"/);
  assert.match(result.body, /id="project-total"/);
  assert.match(result.body, /id="analysis-title"/);
  assert.match(result.body, /Running apps, health, CPU and memory/);
  assert.doesNotMatch(
    result.body,
    /Storefront|Atlas API|Pulse Analytics|CPU usage|Memory usage|Verification passed|Jamie Davis/,
  );
  assert.doesNotMatch(result.body, /<!-- section:/);
});

test('graph renders the demo workspace without a remote connection form', async () => {
  const result = await request(createHandler(), '/graph.html', false);
  assert.equal(result.status, 200);
  assert.match(result.body, /Refresh projects/);
  assert.match(result.body, /href="add-project\.html">Add project/);
  assert.match(result.body, /Project catalogue/);
  assert.match(result.body, /id="docker-status"/);
  assert.match(result.body, /id="graph-instance-list"/);
  assert.doesNotMatch(result.body, /github|username|token/i);
});

test('add-project page provides the import form and is linked from the sidebar', async () => {
  const page = await request(createHandler(), '/add-project.html', false);
  assert.equal(page.status, 200);
  assert.match(page.body, /Public GitHub repository URL/);
  assert.match(page.body, /id="repository-form"/);
  assert.match(page.body, /scripts\/add-project\.js/);
  assert.match(page.body, /href="add-project\.html"/);

  const script = await request(
    createHandler(),
    '/scripts/add-project.js',
    false,
  );
  assert.equal(script.status, 200);
  assert.match(script.body, /\/api\/projects/);
});

test('dashboard project list does not contain the repository import form', async () => {
  const page = await request(createHandler(), '/', false);
  assert.doesNotMatch(page.body, /id="repository-form"/);
  assert.match(page.body, /href="add-project\.html"/);
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
