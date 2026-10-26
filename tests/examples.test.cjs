const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { listExamples } = require('../services/examples.cjs');

test('each example folder becomes exactly one project, without service nodes', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nucleus-examples-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, 'TaskNest'));
  await fs.mkdir(path.join(directory, 'AnotherApp'));
  await fs.mkdir(path.join(directory, '.hidden'));
  await fs.writeFile(path.join(directory, '.DS_Store'), 'ignored');
  await fs.writeFile(
    path.join(directory, 'TaskNest/package.json'),
    JSON.stringify({ name: 'different-package-name', version: '1.0.0' }),
  );
  let projects = await listExamples(directory);
  assert.deepEqual(
    projects.map((project) => project.name),
    ['AnotherApp', 'TaskNest'],
  );
  assert.equal(projects[1].version, '1.0.0');
  assert.equal(projects[1].directory, 'examples/TaskNest');
  assert.ok(
    projects.every(
      (project) =>
        project.services.length === 0 && project.source === 'example',
    ),
  );
  await fs.rm(path.join(directory, 'AnotherApp'), { recursive: true });
  projects = await listExamples(directory);
  assert.deepEqual(
    projects.map((project) => project.name),
    ['TaskNest'],
  );
});

test('missing examples directory returns no projects', async () => {
  assert.deepEqual(
    await listExamples(path.join(__dirname, 'nonexistent-examples')),
    [],
  );
});
