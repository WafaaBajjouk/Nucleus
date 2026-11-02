const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  listPublicRepositories,
} = require('../models/public-repository-catalogue.cjs');

const execute = promisify(execFile);
const failure = (message, status = 400) =>
  Object.assign(Error(message), { status });

function parseGitHubUrl(input) {
  if (typeof input !== 'string' || input.length > 300)
    throw failure('Enter a public GitHub repository URL.');

  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw failure('Enter a valid public GitHub repository URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(url.pathname)
  ) {
    throw failure('Only public GitHub HTTPS repository URLs are supported.');
  }

  const [, owner, repository] = url.pathname.match(
    /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/,
  );
  if (['.', '..'].includes(owner) || ['.', '..'].includes(repository))
    throw failure('Enter a valid public GitHub repository URL.');

  return {
    owner,
    name: repository,
    url: `https://github.com/${owner}/${repository}`,
    cloneUrl: `https://github.com/${owner}/${repository}.git`,
  };
}

function createPublicRepositories({
  root = path.join(__dirname, '..'),
  run = execute,
} = {}) {
  const directory = path.join(root, '.nucleus', 'projects');
  let queue = Promise.resolve();

  async function add(input) {
    const repository = parseGitHubUrl(input);
    let release;
    const previous = queue;
    queue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const current = await listPublicRepositories(root);
      if (current.some((item) => item.url === repository.url))
        throw failure('This repository is already in the project list.', 409);

      const id = randomUUID();
      const projectDirectory = path.join(directory, id);
      const sourceDirectory = path.join(projectDirectory, 'source');
      await fs.mkdir(projectDirectory, { recursive: true, mode: 0o700 });
      try {
        await run(
          'git',
          [
            'clone',
            '--depth',
            '1',
            '--single-branch',
            '--no-tags',
            '--no-recurse-submodules',
            '--',
            repository.cloneUrl,
            sourceDirectory,
          ],
          {
            cwd: root,
            timeout: 120000,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
            env: {
              ...process.env,
              GIT_TERMINAL_PROMPT: '0',
              GIT_CONFIG_NOSYSTEM: '1',
              GIT_CONFIG_GLOBAL: os.devNull,
            },
          },
        );
        await fs.writeFile(
          path.join(projectDirectory, 'project.json'),
          JSON.stringify(
            {
              id: `repository:${id}`,
              name: repository.name,
              owner: repository.owner,
              url: repository.url,
            },
            null,
            2,
          ),
          { mode: 0o600 },
        );
      } catch (error) {
        await fs.rm(projectDirectory, { recursive: true, force: true });
        if (error.status) throw error;
        if (error.code === 'ENOENT')
          throw failure('Git is required to import a public repository.', 503);
        if (error.killed)
          throw failure('Repository clone timed out. Try again later.', 504);
        throw failure(
          'Could not clone this public repository. Check the URL and confirm it is public.',
          502,
        );
      }

      return (await listPublicRepositories(root)).find(
        (item) => item.id === `repository:${id}`,
      );
    } finally {
      release();
    }
  }

  return {
    add,
    list: () => listPublicRepositories(root),
  };
}

module.exports = { createPublicRepositories, parseGitHubUrl };
