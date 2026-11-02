const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  createInstances,
  containerState,
  findDockerExecutable,
} = require('../services/instances.cjs');

async function fixture(t, behavior = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nucleus-status-'));
  const project = path.join(root, 'examples', 'TaskNest');
  await fs.mkdir(project, { recursive: true });
  await fs.writeFile(path.join(project, 'compose.yaml'), 'services: {}');
  await fs.writeFile(
    path.join(project, 'package.json'),
    JSON.stringify({ version: '1.0.0', description: 'Tasks' }),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  let nextPort = 45000;
  const manager = createInstances({
    root,
    async run(args, options) {
      calls.push({ args, options });
      await behavior.run?.(args, options);
      if (args.includes('config')) {
        const id = args[2];
        return {
          stdout: JSON.stringify({
            services: {
              app: {
                build: { context: project },
                ports: [
                  {
                    host_ip: '127.0.0.1',
                    published: '0',
                    target: 3000,
                  },
                ],
                volumes: [
                  { type: 'volume', source: 'tasks-data', target: '/app/data' },
                ],
              },
            },
            volumes: { 'tasks-data': { name: `${id}_tasks-data` } },
            networks: { default: { name: `${id}_default` } },
          }),
        };
      }
      if (args.includes('port')) return { stdout: `127.0.0.1:${nextPort++}\n` };
      if (args.includes('ps'))
        return {
          stdout: JSON.stringify([{ State: 'running', Health: 'healthy' }]),
        };
      return { stdout: '' };
    },
  });
  async function settled(id) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const current = (await manager.list()).find((item) => item.id === id);
      if (
        current?.runtimeStatus === 'up' ||
        current?.runtimeStatus === 'failed'
      )
        return current;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw Error('Instance launch did not settle.');
  }
  return { root, calls, manager, settled };
}

test('Docker discovery finds the user-installed CLI outside the server PATH', async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'nucleus-docker-path-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const docker = path.join(home, '.local', 'nucleus-tools', 'bin', 'docker');
  await fs.mkdir(path.dirname(docker), { recursive: true });
  await fs.writeFile(docker, '#!/bin/sh\n');
  await fs.chmod(docker, 0o755);

  assert.equal(
    findDockerExecutable({ pathValue: '/system/bin', home, configured: '' }),
    docker,
  );
});

test('container states distinguish running, stopped and unknown Compose output', () => {
  assert.equal(containerState([{ State: 'running' }]), 'up');
  assert.equal(containerState([{ State: 'exited' }]), 'down');
  assert.equal(containerState([{ State: 'created' }]), 'down');
  assert.equal(containerState([{ State: 'restarting' }]), 'down');
  assert.equal(containerState([{ State: 'paused' }]), 'down');
  assert.equal(containerState([{ State: 'removing' }]), 'down');
  assert.equal(containerState([{ State: 'weird' }]), 'unknown');
  assert.equal(containerState([]), 'down');
});

test('engine readiness identifies missing Docker, Compose or a stopped engine', async (t) => {
  const cases = [
    {
      args: (args) => args[0] === '--version',
      message: /Docker CLI not found/,
    },
    {
      args: (args) => args[0] === 'compose',
      message: /Compose v2 is unavailable/,
    },
    {
      args: (args) => args[0] === 'info',
      message: /engine is not running or reachable/,
    },
  ];

  for (const testCase of cases) {
    const { manager } = await fixture(t, {
      run(args) {
        if (testCase.args(args)) throw Error('unavailable');
      },
    });
    const result = await manager.engineStatus();
    assert.equal(result.ready, false);
    assert.match(result.message, testCase.message);
  }

  const { calls, manager } = await fixture(t);
  assert.deepEqual(await manager.engineStatus(), {
    ready: true,
    message: 'Docker Engine and Compose are ready.',
  });
  assert.deepEqual(
    calls.map((call) => call.args),
    [
      ['--version'],
      ['compose', 'version'],
      ['info', '--format', '{{.ServerVersion}}'],
    ],
  );
});

test('launch creates isolated Compose projects, ports, network and volume', async (t) => {
  const { root, calls, manager, settled } = await fixture(t);
  const a = await manager.launch('example:TaskNest');
  const b = await manager.launch('example:TaskNest');
  assert.notEqual(a.id, b.id);
  const [readyA, readyB] = await Promise.all([settled(a.id), settled(b.id)]);
  assert.equal(readyA.runtimeStatus, 'up');
  assert.equal(readyB.runtimeStatus, 'up');
  assert.notEqual(readyA.url, readyB.url);
  assert.equal(readyA.health, 'healthy');

  for (const launch of [a, b]) {
    const config = JSON.parse(
      await fs.readFile(
        path.join(root, '.nucleus/instances', launch.id, 'compose.json'),
      ),
    );
    assert.equal(config.volumes['tasks-data'].name, `${launch.id}_tasks-data`);
    assert.equal(config.networks.default.name, `${launch.id}_default`);
    const up = calls.find(
      (call) => call.args[2] === launch.id && call.args.includes('up'),
    );
    assert.ok(up.args.includes('--build'));
    assert.ok(up.args.includes('--wait'));
    const configCall = calls.find(
      (call) => call.args[2] === launch.id && call.args.includes('config'),
    );
    assert.equal(configCall.options.env.DEMO_PORT, '0');
  }
});

test('only allowlisted local projects can be launched', async (t) => {
  const { calls, manager } = await fixture(t);
  await assert.rejects(manager.launch('example:../../etc'), { status: 400 });
  await assert.rejects(manager.launch('example:constructor'), { status: 400 });
  await assert.rejects(manager.launch('example:Other'), { status: 400 });
  assert.equal(calls.length, 0);
});

test('missing Docker executable gives cross-platform installation guidance', async (t) => {
  const { manager, settled } = await fixture(t, {
    run() {
      throw Object.assign(Error('spawn docker ENOENT'), { code: 'ENOENT' });
    },
  });
  const launch = await manager.launch('example:TaskNest');
  const result = await settled(launch.id);
  assert.match(result.message, /Docker CLI not found/);
  assert.match(result.message, /Docker Desktop.*Docker Engine/);
  assert.match(result.message, /restart Nucleus/i);
});

test('launch failures stay visible and Compose startup cleans partial resources', async (t) => {
  const { calls, manager, root } = await fixture(t, {
    run(args) {
      if (args.includes('up')) throw Error('health check failed');
    },
  });
  const launch = await manager.launch('example:TaskNest');
  for (let attempt = 0; attempt < 100; attempt++) {
    const record = JSON.parse(
      await fs.readFile(
        path.join(root, '.nucleus/instances', launch.id, 'instance.json'),
        'utf8',
      ),
    );
    if (record.status === 'failed') {
      assert.match(record.message, /Partial deployment removed/);
      assert.ok(calls.some((call) => call.args.includes('down')));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw Error('Failed deployment did not settle.');
});

test('instance removal deletes only the selected Compose project and its volume', async (t) => {
  const { calls, manager, settled } = await fixture(t);
  const first = await manager.launch('example:TaskNest');
  const second = await manager.launch('example:TaskNest');
  await Promise.all([settled(first.id), settled(second.id)]);

  await manager.remove(first.id);

  assert.deepEqual(
    (await manager.list()).map((instance) => instance.id),
    [second.id],
  );
  const down = calls.find(
    (call) => call.args[2] === first.id && call.args.includes('down'),
  );
  assert.ok(down.args.includes('--volumes'));
});
