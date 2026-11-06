// Generates a Compose file for an imported repository that has a Dockerfile
// but no Compose file. Nothing is guessed: the port comes from EXPOSE and the
// health check from HEALTHCHECK. The result is validated like any Compose file.

const failure = (message, status = 400) =>
  Object.assign(Error(message), { status });

function instructions(text) {
  const lines = [];
  let current = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!current && (!line || line.startsWith('#'))) continue;
    if (current && line.startsWith('#')) continue;
    if (line.endsWith('\\')) {
      current += `${line.slice(0, -1)} `;
      continue;
    }
    current += line;
    if (current.trim()) lines.push(current.trim());
    current = '';
  }
  if (current.trim()) lines.push(current.trim());
  return lines.map((line) => {
    const [keyword] = line.split(/\s/, 1);
    return { keyword: keyword.toUpperCase(), args: line.slice(keyword.length).trim() };
  });
}

function parseHealthcheck(args) {
  if (/^NONE$/i.test(args)) return null;
  const options = { interval: 'interval', timeout: 'timeout', 'start-period': 'start_period', 'start-interval': 'start_interval', retries: 'retries' };
  const healthcheck = {};
  let rest = args;
  let match;
  while ((match = rest.match(/^--([a-z-]+)=(\S+)\s*/))) {
    const key = options[match[1]];
    if (!key) throw failure('Nucleus could not read the Dockerfile HEALTHCHECK.');
    healthcheck[key] = key === 'retries' ? Number(match[2]) : match[2];
    rest = rest.slice(match[0].length);
  }
  const command = rest.match(/^CMD\s+(.+)$/is)?.[1].trim();
  if (!command) throw failure('Nucleus could not read the Dockerfile HEALTHCHECK.');
  if (command.startsWith('[')) {
    let parts;
    try {
      parts = JSON.parse(command);
    } catch {
      throw failure('Nucleus could not read the Dockerfile HEALTHCHECK.');
    }
    if (!Array.isArray(parts) || !parts.length || parts.some((part) => typeof part !== 'string'))
      throw failure('Nucleus could not read the Dockerfile HEALTHCHECK.');
    healthcheck.test = ['CMD', ...parts];
  } else {
    healthcheck.test = ['CMD-SHELL', command];
  }
  return healthcheck;
}

function generateCompose(dockerfile, sourceDirectory) {
  let ports = [];
  let healthcheck;
  // Only the final build stage describes the running container.
  for (const { keyword, args } of instructions(dockerfile)) {
    if (keyword === 'FROM') {
      ports = [];
      healthcheck = undefined;
    } else if (keyword === 'EXPOSE') {
      for (const token of args.split(/\s+/).filter(Boolean)) {
        const port = token.match(/^(\d{1,5})(?:\/(tcp|udp))?$/i);
        if (!port || port[2]?.toLowerCase() === 'udp')
          throw failure('The Dockerfile must EXPOSE exactly one TCP port as a number.');
        ports.push(Number(port[1]));
      }
    } else if (keyword === 'HEALTHCHECK') {
      healthcheck = parseHealthcheck(args);
    }
  }

  const unique = [...new Set(ports)];
  if (unique.length !== 1 || unique[0] < 1 || unique[0] > 65535)
    throw failure('The Dockerfile must EXPOSE exactly one TCP port as a number.');
  if (!healthcheck)
    throw failure(
      'The Dockerfile has no HEALTHCHECK. Nucleus generates a Compose file only when it can check the app is healthy.',
    );

  return {
    services: {
      app: {
        build: { context: sourceDirectory, dockerfile: 'Dockerfile' },
        ports: [{ target: unique[0], host_ip: '127.0.0.1', published: '0', protocol: 'tcp' }],
        healthcheck,
      },
    },
  };
}

module.exports = { generateCompose };
