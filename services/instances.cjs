const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomUUID } = require('node:crypto');
const { constants, accessSync } = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const execute = promisify(execFile);
const supported = {
  TaskNest: { port: 3000, variable: 'DEMO_PORT' },
  UnitLab: { port: 3001, variable: 'UNITLAB_PORT' },
  JsonDesk: { port: 3002, variable: 'JSONDESK_PORT' },
  TextScope: { port: 3003, variable: 'TEXTSCOPE_PORT' },
};
const unsupportedServiceOptions = [
  'cap_add',
  'cgroup',
  'configs',
  'container_name',
  'device_cgroup_rules',
  'devices',
  'extends',
  'external_links',
  'ipc',
  'links',
  'network_mode',
  'pid',
  'privileged',
  'runtime',
  'secrets',
  'security_opt',
  'sysctls',
  'userns_mode',
  'uts',
  'volumes_from',
];
const validId = /^nucleus-[a-f0-9-]{36}$/;
const failure = (message, status = 400) =>
  Object.assign(Error(message), { status });
const isWithin = (parent, child) => {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
};
function findDockerExecutable({
  pathValue = process.env.PATH || '',
  home = os.homedir(),
  configured = process.env.NUCLEUS_DOCKER_PATH,
} = {}) {
  const candidates = [
    configured,
    ...pathValue
      .split(path.delimiter)
      .map((directory) => (directory ? path.join(directory, 'docker') : '')),
    path.join(home, '.local', 'nucleus-tools', 'bin', 'docker'),
    '/Applications/Docker.app/Contents/Resources/bin/docker',
    '/opt/homebrew/bin/docker',
    '/usr/local/bin/docker',
    '/usr/bin/docker',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EACCES') throw error;
    }
  }
  return 'docker';
}

const parseContainers = (output) => {
  const text = output.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return text.split(/\r?\n/).map((line) => JSON.parse(line));
  }
};
const containerState = (containers) => {
  if (!containers.length) return 'down';
  const states = containers.map((container) =>
    String(container.State ?? container.Status ?? '').toLowerCase(),
  );
  if (states.some((state) => state === 'running' || state.startsWith('up ')))
    return 'up';
  if (
    states.every((state) =>
      /^(exited|stopped|created|paused|restarting|dead|removing)\b/.test(state),
    )
  )
    return 'down';
  return 'unknown';
};
const parsePercent = (value) => {
  const percent = Number.parseFloat(String(value).replace('%', ''));
  return Number.isFinite(percent) ? percent : null;
};

async function validateComposeConfig(config, instanceId, source, expectedPort) {
  const reject = () =>
    failure(
      'Unsupported Compose configuration. Nucleus supports one isolated app service with a single TCP port and no host access.',
    );
  const serviceNames = Object.keys(config.services || {});
  const service = config.services?.app;
  const ports = service?.ports;
  if (
    serviceNames.length !== 1 ||
    serviceNames[0] !== 'app' ||
    !service ||
    typeof service !== 'object' ||
    !Array.isArray(ports) ||
    ports.length !== 1 ||
    unsupportedServiceOptions.some(
      (key) => service[key] !== undefined && service[key] !== null,
    ) ||
    (service.volumes !== undefined &&
      (!Array.isArray(service.volumes) ||
        service.volumes.some((volume) => volume.type !== 'volume'))) ||
    (config.secrets && Object.keys(config.secrets).length) ||
    (config.configs && Object.keys(config.configs).length)
  )
    throw reject();

  const port = ports[0];
  const target = Number(port.target);
  if (
    !Number.isInteger(target) ||
    target < 1 ||
    target > 65535 ||
    (expectedPort !== null && target !== expectedPort) ||
    (port.protocol && port.protocol !== 'tcp') ||
    (port.mode && port.mode !== 'ingress')
  )
    throw reject();

  if (!service.image && !service.build) throw reject();
  if (service.build) {
    const build =
      typeof service.build === 'string'
        ? { context: service.build }
        : service.build;
    if (
      !build.context ||
      build.additional_contexts ||
      build.privileged ||
      build.secrets ||
      build.ssh ||
      build.entitlements ||
      build.extra_hosts ||
      build.network === 'host'
    )
      throw reject();
    const context = path.resolve(source, build.context);
    const contextReal = await fs.realpath(context);
    if (!isWithin(source, contextReal)) throw reject();
    if (build.dockerfile) {
      const dockerfileReal = await fs.realpath(
        path.resolve(contextReal, build.dockerfile),
      );
      if (!isWithin(source, dockerfileReal)) throw reject();
    }
  }

  for (const volume of Object.values(config.volumes || {})) {
    if (
      volume.external ||
      volume.driver_opts ||
      !volume.name?.startsWith(`${instanceId}_`)
    )
      throw reject();
  }
  for (const network of Object.values(config.networks || {})) {
    if (
      network.external ||
      network.driver_opts ||
      !['bridge', undefined].includes(network.driver) ||
      !network.name?.startsWith(`${instanceId}_`)
    )
      throw reject();
  }

  port.host_ip = '127.0.0.1';
  port.published = '0';
  return service;
}

function createInstances({ root = path.join(__dirname, '..'), run } = {}) {
  const dockerExecutable = findDockerExecutable();
  const runDocker =
    run || ((args, options) => execute(dockerExecutable, args, options));
  const directory = path.join(root, '.nucleus', 'instances');
  const active = new Set();
  const removing = new Set();
  const options = {
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  };
  const location = (id) => path.join(directory, id);
  const compose = (id, composeFile, ...args) => [
    'compose',
    '-p',
    id,
    '-f',
    composeFile,
    ...args,
  ];

  async function engineStatus() {
    for (const [args, message] of [
      [
        ['--version'],
        'Docker CLI not found. Install Docker Desktop (macOS or Windows) or Docker Engine with Compose v2 (Linux), then restart Nucleus.',
      ],
      [
        ['compose', 'version'],
        'Docker Compose v2 is unavailable. Docker Desktop includes it; on Linux, install the Compose plugin, then check again.',
      ],
      [
        ['info', '--format', '{{.ServerVersion}}'],
        'Docker is installed, but its engine is not running or reachable. Start Docker Desktop, the Docker service, or your provider (for Colima, run `colima start`), then check again.',
      ],
    ]) {
      try {
        await runDocker(args, { ...options, timeout: 15000 });
      } catch {
        return { ready: false, message };
      }
    }
    return { ready: true, message: 'Docker Engine and Compose are ready.' };
  }

  async function save(record) {
    const file = path.join(location(record.id), 'instance.json');
    await fs.writeFile(`${file}.tmp`, JSON.stringify(record, null, 2));
    await fs.rename(`${file}.tmp`, file);
  }

  async function read(id) {
    if (!validId.test(id)) throw failure('Unknown instance.', 404);
    try {
      const record = JSON.parse(
        await fs.readFile(path.join(location(id), 'instance.json'), 'utf8'),
      );
      if (!record || record.id !== id)
        throw failure('Invalid instance record.', 500);
      return record;
    } catch (error) {
      if (error.code === 'ENOENT') throw failure('Unknown instance.', 404);
      throw error;
    }
  }

  async function deploy(record, project) {
    let deploymentStarted = false;
    let stage = 'Docker engine';
    const source = project.sourceDirectory;
    const composeSource = path.join(source, project.composeFile);
    const composeFile = path.join(location(record.id), 'compose.json');
    try {
      const sourceReal = await fs.realpath(source);
      const rootReal = await fs.realpath(root);
      const projectRoot = project.imported
        ? await fs.realpath(path.join(root, '.nucleus', 'projects'))
        : await fs.realpath(path.join(root, 'examples'));
      const composeReal = await fs.realpath(composeSource);
      if (
        !isWithin(rootReal, sourceReal) ||
        !isWithin(projectRoot, sourceReal) ||
        !isWithin(sourceReal, composeReal)
      )
        throw failure(
          'Linked project files outside the project are not supported.',
        );

      const readiness = await engineStatus();
      if (!readiness.ready) throw failure(readiness.message, 503);
      stage = 'Compose configuration';
      const { stdout } = await runDocker(
        [
          'compose',
          '-p',
          record.id,
          '-f',
          composeSource,
          'config',
          '--format',
          'json',
        ],
        {
          ...options,
          cwd: sourceReal,
          env: project.variable
            ? { ...process.env, [project.variable]: '0' }
            : process.env,
        },
      );
      const config = JSON.parse(stdout);
      const service = await validateComposeConfig(
        config,
        record.id,
        sourceReal,
        project.port,
      );

      await fs.writeFile(composeFile, JSON.stringify(config));
      record.image = service.image || `${record.id}-app`;
      deploymentStarted = true;
      stage = 'image build and health check';
      await runDocker(
        compose(
          record.id,
          composeFile,
          'up',
          '--build',
          '--wait',
          '--wait-timeout',
          '60',
        ),
        options,
      );
      const { stdout: portOutput } = await runDocker(
        compose(
          record.id,
          composeFile,
          'port',
          'app',
          String(project.port || service.ports[0].target),
        ),
        { ...options, timeout: 15000 },
      );
      const match = portOutput.trim().match(/^127\.0\.0\.1:(\d+)$/);
      if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535)
        throw failure('Docker did not return a valid local application port.');

      record.status = 'ready';
      record.url = `http://127.0.0.1:${match[1]}`;
      record.message = 'Application started successfully.';
    } catch (error) {
      record.status = 'failed';
      record.message =
        error.code === 'ENOENT'
          ? 'Nucleus could not find Docker on its PATH. Restart Nucleus and ensure Docker is available in its environment.'
          : error.status
            ? error.message
            : `Launch failed during ${stage}. Check Docker and the project configuration.`;
      if (error.stderr) {
        await fs
          .writeFile(path.join(location(record.id), 'error.log'), error.stderr)
          .catch((logError) =>
            console.error('Could not save Docker output:', logError.message),
          );
      }
      if (deploymentStarted) {
        try {
          await runDocker(
            compose(
              record.id,
              composeFile,
              'down',
              '--volumes',
              '--remove-orphans',
              '--timeout',
              '10',
            ),
            { ...options, timeout: 60000 },
          );
          record.message += ' Partial deployment removed.';
        } catch {
          record.status = 'cleanup-needed';
          record.message +=
            ' Cleanup failed; remove this instance after Docker is available.';
        }
      }
    } finally {
      try {
        await save(record);
      } finally {
        active.delete(record.id);
      }
    }
  }

  async function launch(projectId) {
    let project;
    let name;
    if (typeof projectId === 'string' && projectId.startsWith('example:')) {
      name = projectId.slice('example:'.length);
      if (!Object.hasOwn(supported, name))
        throw failure('Select a supported project.');
      const { listExamples } = require('../models/example-catalogue.cjs');
      const example = (await listExamples(path.join(root, 'examples'))).find(
        (item) => item.id === projectId && item.composeFile,
      );
      if (!example)
        throw failure('Project does not have a supported Compose file.');
      project = {
        ...example,
        sourceDirectory: path.join(root, 'examples', name),
        port: supported[name].port,
        variable: supported[name].variable,
      };
    } else if (
      typeof projectId === 'string' &&
      /^repository:[a-f0-9-]{36}$/.test(projectId)
    ) {
      const {
        listPublicRepositories,
      } = require('../models/public-repository-catalogue.cjs');
      const imported = (await listPublicRepositories(root)).find(
        (item) => item.id === projectId && item.composeFile,
      );
      if (!imported)
        throw failure('Project does not have a supported Compose file.');
      name = imported.name;
      project = {
        ...imported,
        sourceDirectory: path.join(root, imported.directory),
        imported: true,
        port: null,
      };
    } else {
      throw failure('Select a supported project.');
    }

    if (active.size >= 2)
      throw failure(
        'Two builds are already in progress. Wait before launching another.',
        409,
      );
    const record = {
      id: `nucleus-${randomUUID()}`,
      projectId,
      name,
      status: 'starting',
      runtimeStatus: 'starting',
      createdAt: new Date().toISOString(),
      message: 'Building and checking the application…',
      url: null,
      image: null,
    };
    active.add(record.id);
    try {
      await fs.mkdir(location(record.id), { recursive: true });
      await save(record);
    } catch (error) {
      active.delete(record.id);
      throw error;
    }
    deploy(record, project).catch((error) =>
      console.error('Could not save launch result:', error.message),
    );
    return { ...record };
  }

  async function list() {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    return Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && validId.test(entry.name))
        .map(async (entry) => {
          const record = await read(entry.name);
          let runtimeStatus = record.status === 'failed' ? 'failed' : 'unknown';
          let health = 'unknown';
          let metrics = null;
          let metricsMessage = 'Resource usage unavailable from Docker.';
          if (active.has(record.id)) {
            runtimeStatus = 'starting';
          } else {
            const composeFile = path.join(location(record.id), 'compose.json');
            try {
              await fs.access(composeFile);
              const { stdout } = await runDocker(
                compose(
                  record.id,
                  composeFile,
                  'ps',
                  '--all',
                  '--format',
                  'json',
                ),
                { ...options, timeout: 15000 },
              );
              const containers = parseContainers(stdout);
              runtimeStatus =
                !containers.length && record.status === 'failed'
                  ? 'failed'
                  : containerState(containers);
              const running = containers.find(
                (container) =>
                  String(container.State ?? container.Status ?? '')
                    .toLowerCase()
                    .startsWith('running') ||
                  String(container.Status ?? '')
                    .toLowerCase()
                    .startsWith('up '),
              );
              health =
                running?.Health ||
                running?.Status?.match(
                  /\((healthy|unhealthy|starting)\)/,
                )?.[1] ||
                'unknown';
              const containerId = running?.ID || running?.Id;
              if (
                runtimeStatus === 'up' &&
                /^[a-f0-9]{12,64}$/i.test(containerId || '')
              ) {
                try {
                  const { stdout: statsOutput } = await runDocker(
                    [
                      'stats',
                      '--no-stream',
                      '--format',
                      '{{json .}}',
                      containerId,
                    ],
                    { ...options, timeout: 15000 },
                  );
                  const stats = parseContainers(statsOutput).find((item) =>
                    String(item.ID || item.Container || '')
                      .toLowerCase()
                      .startsWith(containerId.slice(0, 12).toLowerCase()),
                  );
                  if (stats) {
                    metrics = {
                      cpuPercent: parsePercent(stats.CPUPerc),
                      memoryUsage: String(stats.MemUsage || ''),
                    };
                    metricsMessage = null;
                  }
                } catch {
                  metricsMessage = 'Docker could not provide resource usage.';
                }
              }
            } catch (error) {
              if (error.code !== 'ENOENT') runtimeStatus = 'unknown';
            }
          }
          return {
            id: record.id,
            projectId: record.projectId,
            name: record.name,
            createdAt: record.createdAt,
            url:
              runtimeStatus === 'up' &&
              typeof record.url === 'string' &&
              /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(record.url)
                ? record.url
                : null,
            image: record.image,
            runtimeStatus,
            health,
            metrics,
            metricsMessage,
            message:
              runtimeStatus === 'unknown'
                ? 'Docker status unavailable.'
                : record.message,
          };
        }),
    ).then((records) =>
      records.sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || ''),
      ),
    );
  }

  async function remove(id) {
    if (active.has(id) || removing.has(id))
      throw failure('Instance operation is still in progress.', 409);
    removing.add(id);
    try {
      const record = await read(id);
      const composeFile = path.join(location(id), 'compose.json');
      try {
        await fs.access(composeFile);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await fs.rm(location(record.id), { recursive: true, force: true });
        return;
      }
      try {
        await runDocker(
          compose(
            id,
            composeFile,
            'down',
            '--volumes',
            '--remove-orphans',
            '--timeout',
            '10',
          ),
          { ...options, timeout: 60000 },
        );
      } catch {
        throw failure(
          'Could not remove this instance. Start Docker and retry.',
          503,
        );
      }
      await fs.rm(location(record.id), { recursive: true, force: true });
    } finally {
      removing.delete(id);
    }
  }

  return { engineStatus, launch, list, remove };
}

module.exports = {
  createInstances,
  containerState,
  findDockerExecutable,
  parseContainers,
};
