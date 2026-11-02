const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  createPublicRepositories,
  parseGitHubUrl,
} = require('../services/public-repositories.cjs');

test('accepts public GitHub HTTPS repository URLs only', () => {
  assert.deepEqual(parseGitHubUrl('https://github.com/acme/task-service.git'), {
    owner: 'acme',
    name: 'task-service',
    url: 'https://github.com/acme/task-service',
    cloneUrl: 'https://github.com/acme/task-service.git',
  });
  for (const url of [
    'git@github.com:acme/task-service.git',
    'https://gitlab.com/acme/task-service',
    'http://github.com/acme/task-service',
    'https://user@github.com/acme/task-service',
    'https://github.com/acme/task-service?token=secret',
    'https://github.com/acme/task-service/tree/main',
    'https://github.com/acme/../task-service',
  ]) {
    assert.throws(() => parseGitHubUrl(url), { status: 400 });
  }
});

test('clones an imported repository into managed storage and lists it', async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nucleus-repositories-'),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const repositories = createPublicRepositories({
    root,
    async run(executable, args, options) {
      calls.push({ executable, args, options });
      const source = args.at(-1);
      await fs.mkdir(source, { recursive: true });
      await fs.writeFile(
        path.join(source, 'package.json'),
        JSON.stringify({ version: '2.1.0', description: 'A team service' }),
      );
      await fs.writeFile(path.join(source, 'compose.yaml'), 'services: {}');
      return { stdout: '', stderr: '' };
    },
  });

  const project = await repositories.add(
    'https://github.com/acme/task-service',
  );
  assert.equal(project.id.startsWith('repository:'), true);
  assert.equal(project.name, 'task-service');
  assert.equal(project.owner, 'acme');
  assert.equal(project.source, 'github');
  assert.equal(project.version, '2.1.0');
  assert.equal(project.description, 'A team service');
  assert.equal(project.composeFile, 'compose.yaml');
  assert.equal(project.launchable, true);
  assert.match(project.directory, /^\.nucleus\/projects\/[a-f0-9-]+\/source$/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executable, 'git');
  assert.deepEqual(calls[0].args.slice(0, 7), [
    'clone',
    '--depth',
    '1',
    '--single-branch',
    '--no-tags',
    '--no-recurse-submodules',
    '--',
  ]);
  assert.equal(calls[0].args[7], 'https://github.com/acme/task-service.git');
  assert.equal(calls[0].options.env.GIT_TERMINAL_PROMPT, '0');
  assert.deepEqual(await repositories.list(), [project]);

  await assert.rejects(
    repositories.add('https://github.com/acme/task-service'),
    { status: 409 },
  );
  assert.equal(calls.length, 1);
});

test('failed clone does not leave a partial imported project', async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nucleus-repo-failure-'),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repositories = createPublicRepositories({
    root,
    async run() {
      throw Object.assign(Error('clone failed'), { stderr: 'not public' });
    },
  });

  await assert.rejects(
    repositories.add('https://github.com/acme/private-project'),
    { status: 502 },
  );
  assert.deepEqual(await repositories.list(), []);
});
