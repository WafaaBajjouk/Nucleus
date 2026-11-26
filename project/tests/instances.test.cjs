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

const healthcheck = {
  test: ['CMD', 'node', '-e', 'process.exit(0)'],
  interval: '3s',
  retries: 10,
};

async function importRepository(root, repositoryId, name) {
  const projectDirectory = path.join(root, '.nucleus', 'projects', repositoryId);
  const source = path.join(projectDirectory, 'source');
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(
    path.join(projectDirectory, 'project.json'),
    JSON.stringify({
      id: `repository:${repositoryId}`,
      name,
      owner: 'acme',
      url: `https://github.com/acme/${name}`,
    }),
  );
  await fs.writeFile(path.join(source, 'compose.yaml'), 'services: {}');
  return source;
}

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
        const configured = await behavior.config?.(args, options, id);
        return {
          stdout: JSON.stringify(
            configured || {
              services: {
                app: {
                  build: { context: options.cwd },
                  healthcheck,
                  ports: [
                    {
                      host_ip: '127.0.0.1',
                      published: '0',
                      target: 3000,
                    },
                  ],
                  volumes: [
                    {
                      type: 'volume',
                      source: 'tasks-data',
                      target: '/app/data',
                    },
                  ],
                },
              },
              volumes: { 'tasks-data': { name: `${id}_tasks-data` } },
              networks: { default: { name: `${id}_default` } },
            },
          ),
        };
      }
      if (args.includes('port')) return { stdout: `127.0.0.1:${nextPort++}\n` };
      if (args[0] === 'stats')
        return {
          stdout: JSON.stringify({
            ID: '0123456789ab',
            CPUPerc: '2.5%',
            MemUsage: '10MiB / 1GiB',
          }),
        };
      if (args.includes('ps'))
        return {
          stdout: JSON.stringify([
            {
              ID: '0123456789ab',
              State: 'running',
              Health: 'healthy',
            },
          ]),
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
  assert.deepEqual(readyA.metrics, {
    cpuPercent: 2.5,
    memoryUsage: '10MiB / 1GiB',
  });

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

test('imported Compose projects launch on an isolated loopback port', async (t) => {
  const { root, calls, manager, settled } = await fixture(t, {
    config(args, options, id) {
      return {
        services: {
          app: {
            build: { context: options.cwd },
            healthcheck,
            ports: [
              {
                host_ip: '127.0.0.1',
                published: '8082',
                target: 3001,
                protocol: 'tcp',
              },
            ],
          },
        },
        networks: { default: { name: `${id}_default` } },
      };
    },
  });
  const repositoryId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const source = path.join(
    root,
    '.nucleus',
    'projects',
    repositoryId,
    'source',
  );
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(
    path.join(root, '.nucleus', 'projects', repositoryId, 'project.json'),
    JSON.stringify({
      id: `repository:${repositoryId}`,
      name: 'lab',
      owner: 'WafaaBajjouk',
      url: 'https://github.com/WafaaBajjouk/lab',
    }),
  );
  await fs.writeFile(
    path.join(source, 'compose.yaml'),
    'services:\n  app:\n    build: .\n',
  );
  const launch = await manager.launch(`repository:${repositoryId}`);
  const result = await settled(launch.id);
  assert.equal(result.runtimeStatus, 'up');
  assert.equal(result.name, 'lab');
  assert.equal(result.url, 'http://127.0.0.1:45000');

  const configCall = calls.find((call) => call.args.includes('config'));
  assert.equal(configCall.options.cwd, await fs.realpath(source));
  assert.equal(
    configCall.args[configCall.args.indexOf('-f') + 1],
    path.join(source, 'compose.yaml'),
  );
  const normalized = JSON.parse(
    await fs.readFile(
      path.join(root, '.nucleus', 'instances', launch.id, 'compose.json'),
      'utf8',
    ),
  );
  assert.equal(normalized.services.app.ports[0].host_ip, '127.0.0.1');
  assert.equal(normalized.services.app.ports[0].published, '0');
  assert.equal(
    calls.find((call) => call.args.includes('port')).args.at(-1),
    '3001',
  );
});

test('imported Compose projects with privileged services are rejected', async (t) => {
  const { root, calls, manager, settled } = await fixture(t, {
    config(args, options) {
      return {
        services: {
          app: {
            build: { context: options.cwd },
            privileged: true,
            ports: [{ target: 3001, published: '8082' }],
          },
        },
      };
    },
  });
  const repositoryId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const projectDirectory = path.join(
    root,
    '.nucleus',
    'projects',
    repositoryId,
  );
  const source = path.join(projectDirectory, 'source');
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(
    path.join(projectDirectory, 'project.json'),
    JSON.stringify({
      id: `repository:${repositoryId}`,
      name: 'unsafe',
      owner: 'acme',
      url: 'https://github.com/acme/unsafe',
    }),
  );
  await fs.writeFile(path.join(source, 'compose.yaml'), 'services: {}');

  const launch = await manager.launch(`repository:${repositoryId}`);
  const result = await settled(launch.id);
  assert.equal(result.runtimeStatus, 'failed');
  assert.match(result.message, /no host access/);
  assert.equal(
    calls.some((call) => call.args.includes('up')),
    false,
  );
});

test('a project without a Compose file or Dockerfile is rejected and nothing is started or recorded', async (t) => {
  const { root, calls, manager } = await fixture(t);
  const repositoryId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const source = await importRepository(root, repositoryId, 'nocompose');
  await fs.rm(path.join(source, 'compose.yaml'));

  await assert.rejects(manager.launch(`repository:${repositoryId}`), {
    status: 400,
    message: 'Project needs a Compose file or a Dockerfile.',
  });
  assert.equal(calls.length, 0, 'Docker must not be called');
  assert.deepEqual(await manager.list(), [], 'no instance record is created');
});

test('a Dockerfile-only project gets a generated Compose file and launches', async (t) => {
  let generated;
  const { root, calls, manager, settled } = await fixture(t, {
    async config(args, options, id) {
      // Stand in for `docker compose config`: echo the generated file back.
      generated = JSON.parse(
        await fs.readFile(args[args.indexOf('-f') + 1], 'utf8'),
      );
      return { ...generated, networks: { default: { name: `${id}_default` } } };
    },
  });
  const repositoryId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const source = await importRepository(root, repositoryId, 'dockeronly');
  await fs.rm(path.join(source, 'compose.yaml'));
  await fs.writeFile(
    path.join(source, 'Dockerfile'),
    'FROM node:22-alpine\nEXPOSE 4000\nHEALTHCHECK CMD ["node","-e","process.exit(0)"]\n',
  );

  const launch = await manager.launch(`repository:${repositoryId}`);
  const result = await settled(launch.id);
  assert.equal(result.runtimeStatus, 'up');
  assert.equal(result.health, 'healthy');

  const configCall = calls.find((call) => call.args.includes('config'));
  assert.equal(
    configCall.args[configCall.args.indexOf('-f') + 1],
    path.join(root, '.nucleus/instances', launch.id, 'generated-compose.json'),
    'the generated file lives with the instance, not in the repository',
  );
  assert.equal(generated.services.app.ports[0].target, 4000);
  assert.deepEqual(generated.services.app.healthcheck.test, [
    'CMD',
    'node',
    '-e',
    'process.exit(0)',
  ]);
  assert.equal(
    calls.find((call) => call.args.includes('port')).args.at(-1),
    '4000',
  );
  await assert.rejects(fs.access(path.join(source, 'compose.yaml')));
});

test('a Dockerfile without HEALTHCHECK is refused before Docker runs', async (t) => {
  const { root, calls, manager } = await fixture(t);
  const repositoryId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const source = await importRepository(root, repositoryId, 'nohealth');
  await fs.rm(path.join(source, 'compose.yaml'));
  await fs.writeFile(
    path.join(source, 'Dockerfile'),
    'FROM node:22-alpine\nEXPOSE 4000\n',
  );

  await assert.rejects(manager.launch(`repository:${repositoryId}`), {
    status: 400,
    message: /no HEALTHCHECK/,
  });
  assert.equal(calls.length, 0, 'Docker must not be called');
  assert.deepEqual(await manager.list(), [], 'no instance record is created');
});

test('projects without a usable healthcheck are rejected before any container starts', async (t) => {
  const variants = [
    ['missing', undefined],
    ['disabled', { ...healthcheck, disable: true }],
    ['NONE', { test: ['NONE'] }],
    ['empty test', { test: [] }],
  ];
  for (const [label, check] of variants) {
    const { root, calls, manager, settled } = await fixture(t, {
      config(args, options) {
        return {
          services: {
            app: {
              build: { context: options.cwd },
              ...(check && { healthcheck: check }),
              ports: [{ target: 3001, published: '8082' }],
            },
          },
        };
      },
    });
    const repositoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await importRepository(root, repositoryId, 'nohealth');
    const launch = await manager.launch(`repository:${repositoryId}`);
    const result = await settled(launch.id);
    assert.equal(result.runtimeStatus, 'failed', label);
    assert.match(result.message, /needs a Compose healthcheck/, label);
    assert.equal(
      calls.some((call) => call.args.includes('up')),
      false,
      `${label}: no container may start`,
    );
  }
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

test('stop and start act on the selected instance only and keep its data', async (t) => {
  const { root, calls, manager, settled } = await fixture(t);
  const first = await manager.launch('example:TaskNest');
  const second = await manager.launch('example:TaskNest');
  const [readyFirst] = await Promise.all([settled(first.id), settled(second.id)]);

  const stopped = await manager.stop(first.id);
  assert.equal(stopped.status, 'stopped');
  const stop = calls.filter((call) => call.args.includes('stop'));
  assert.equal(stop.length, 1);
  assert.equal(stop[0].args[2], first.id);
  assert.ok(!calls.some((call) => call.args.includes('down')));

  const started = await manager.start(first.id);
  const up = calls.filter(
    (call) => call.args[2] === first.id && call.args.includes('up'),
  );
  assert.equal(up.length, 2);
  assert.ok(up[1].args.includes('--wait'));
  assert.ok(up[1].args.includes('--no-build'));
  assert.equal(started.status, 'ready');
  assert.notEqual(started.url, readyFirst.url);
  const record = JSON.parse(
    await fs.readFile(
      path.join(root, '.nucleus/instances', first.id, 'instance.json'),
    ),
  );
  assert.equal(record.status, 'ready');
  assert.equal(record.url, started.url);
  assert.ok(
    !calls.some((call) => call.args[2] === second.id && call.args.includes('stop')),
  );
});

test('a start whose health check fails is stopped again and reported', async (t) => {
  let failStart = false;
  const { calls, manager, settled } = await fixture(t, {
    async run(args) {
      if (failStart && args.includes('up'))
        throw Object.assign(Error('unhealthy'), { stderr: 'container unhealthy' });
    },
  });
  const launched = await manager.launch('example:TaskNest');
  await settled(launched.id);
  await manager.stop(launched.id);
  failStart = true;

  await assert.rejects(manager.start(launched.id), (error) => {
    assert.equal(error.status, 502);
    assert.match(error.message, /health check did not pass/);
    return true;
  });
  assert.equal(calls.filter((call) => call.args.includes('stop')).length, 2);
  const listed = (await manager.list()).find((item) => item.id === launched.id);
  assert.equal(listed.status, 'stopped');
});

test('failed launches and unknown instances cannot be stopped or started', async (t) => {
  const { calls, manager, settled } = await fixture(t, {
    async run(args) {
      if (args.includes('up')) throw Error('build failed');
    },
  });
  const launched = await manager.launch('example:TaskNest');
  await settled(launched.id);
  const before = calls.length;
  for (const operation of [manager.stop, manager.start])
    await assert.rejects(operation(launched.id), { status: 409 });
  assert.equal(calls.length, before);
  await assert.rejects(manager.stop('nucleus-not-real'), { status: 404 });
});

test('a record written by an older version still lists (contract check)', async (t) => {
  const { root, manager } = await fixture(t);
  const id = 'nucleus-22222222-2222-4222-8222-222222222222';
  const directory = path.join(root, '.nucleus/instances', id);
  await fs.mkdir(directory, { recursive: true });
  // Fields as written before stop/start existed: no compose.json, no new keys.
  await fs.writeFile(
    path.join(directory, 'instance.json'),
    JSON.stringify({
      id,
      projectId: 'example:TaskNest',
      name: 'TaskNest',
      status: 'failed',
      createdAt: '2026-11-02T10:00:00.000Z',
      message: 'Launch failed during image build and health check.',
      url: null,
      image: null,
    }),
  );
  const [listed] = await manager.list();
  assert.equal(listed.id, id);
  assert.equal(listed.runtimeStatus, 'failed');
  assert.equal(listed.message, 'Launch failed during image build and health check.');
});

test('a retried launch with the same requestId starts one instance only', async (t) => {
  const { root, calls, manager, settled } = await fixture(t);
  const requestId = '33333333-3333-4333-8333-333333333333';
  const [first, concurrent] = await Promise.all([
    manager.launch('example:TaskNest', requestId),
    manager.launch('example:TaskNest', requestId),
  ]);
  assert.equal(concurrent.id, first.id);
  await settled(first.id);
  const retry = await manager.launch('example:TaskNest', requestId);
  assert.equal(retry.id, first.id);
  assert.equal(calls.filter((call) => call.args.includes('up')).length, 1);
  assert.equal((await manager.list()).length, 1);

  // After a Nucleus restart the request is found in the saved record.
  const restarted = createInstances({ root, run: async () => ({ stdout: '' }) });
  assert.equal((await restarted.launch('example:TaskNest', requestId)).id, first.id);

  await assert.rejects(manager.launch('example:UnitLab', requestId), {
    status: 409,
  });
  await assert.rejects(manager.launch('example:TaskNest', 'not-a-uuid'), {
    status: 400,
  });
});

test('logs come from the selected instance, or from the saved launch output', async (t) => {
  let dockerDown = false;
  const { root, calls, manager, settled } = await fixture(t, {
    async run(args) {
      if (dockerDown && args.includes('logs')) throw Error('engine stopped');
    },
  });
  const launched = await manager.launch('example:TaskNest');
  await settled(launched.id);

  const live = await manager.logs(launched.id);
  assert.equal(live.source, 'docker');
  const call = calls.find((item) => item.args.includes('logs'));
  assert.equal(call.args[2], launched.id);
  assert.ok(call.args.includes('--tail'));

  dockerDown = true;
  await assert.rejects(manager.logs(launched.id), { status: 503 });
  await fs.writeFile(
    path.join(root, '.nucleus/instances', launched.id, 'error.log'),
    'x'.repeat(70 * 1024) + 'last line',
  );
  const saved = await manager.logs(launched.id);
  assert.equal(saved.source, 'launch');
  assert.equal(saved.truncated, true);
  assert.ok(saved.text.endsWith('last line'));
  await assert.rejects(manager.logs('nucleus-not-real'), { status: 404 });
});

test('a failed launch shows the Docker output saved at launch', async (t) => {
  const { calls, manager, settled } = await fixture(t, {
    async run(args) {
      if (args.includes('up'))
        throw Object.assign(Error('build failed'), { stderr: 'npm ERR! missing script' });
    },
  });
  const launched = await manager.launch('example:TaskNest');
  await settled(launched.id);
  const result = await manager.logs(launched.id);
  assert.equal(result.source, 'launch');
  assert.match(result.text, /missing script/);
  assert.ok(!calls.some((call) => call.args.includes('logs')));
});
