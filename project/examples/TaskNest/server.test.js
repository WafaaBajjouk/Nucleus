const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('./server');

async function start(directory) {
  const server = createApp(directory);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    server,
    url,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
async function send(url, method = 'GET', body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

test('tasks can be created, completed, reopened and deleted; data survives a restart', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'task-board-test-'),
  );
  let app;
  t.after(async () => {
    if (app) await app.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  app = await start(directory);
  assert.deepEqual((await send(`${app.url}/api/tasks`)).data, []);
  const created = await send(`${app.url}/api/tasks`, 'POST', {
    title: '  Prepare project demo  ',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.title, 'Prepare project demo');
  const id = created.data.id;
  assert.equal(
    (await send(`${app.url}/api/tasks/${id}`, 'PATCH', { completed: true }))
      .data.completed,
    true,
  );
  await app.close();
  app = null;
  app = await start(directory);
  const restored = await send(`${app.url}/api/tasks`);
  assert.equal(restored.data[0].id, id);
  assert.equal(restored.data[0].completed, true);
  assert.equal(
    (await send(`${app.url}/api/tasks/${id}`, 'PATCH', { completed: false }))
      .data.completed,
    false,
  );
  assert.equal(
    (await send(`${app.url}/api/tasks/${id}`, 'DELETE')).status,
    200,
  );
  assert.deepEqual((await send(`${app.url}/api/tasks`)).data, []);
  assert.equal(
    (await send(`${app.url}/api/tasks/${id}`, 'DELETE')).status,
    404,
  );
});

test('validation protects stored data and readiness/static routes are served', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'task-board-test-'),
  );
  const app = await start(directory);
  t.after(async () => {
    await app.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  for (const title of ['', '  ', 'x'.repeat(121), 12]) {
    assert.equal(
      (await send(`${app.url}/api/tasks`, 'POST', { title })).status,
      400,
    );
  }
  assert.equal(
    (await send(`${app.url}/api/tasks/1234`, 'PATCH', { completed: 'yes' }))
      .status,
    400,
  );
  const invalid = await fetch(`${app.url}/api/tasks`, {
    method: 'POST',
    body: '{',
  });
  assert.equal(invalid.status, 400);
  assert.equal(
    (await send(`${app.url}/api/tasks`, 'POST', { title: 'x'.repeat(5000) }))
      .status,
    413,
  );
  assert.deepEqual((await send(`${app.url}/api/tasks`)).data, []);
  assert.equal((await send(`${app.url}/health`)).data.status, 'ok');
  assert.equal((await send(`${app.url}/data/tasks.json`)).status, 404);
  assert.equal((await send(`${app.url}/api/tasks`, 'PUT')).status, 405);
  const home = await fetch(app.url);
  assert.match(await home.text(), /Task Board/);
  for (const asset of ['/app.js', '/styles.css'])
    assert.equal((await fetch(app.url + asset)).status, 200);
});
