const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');

const composeFilenames = [
  'compose.yaml',
  'compose.yml',
  'docker-compose.yaml',
  'docker-compose.yml',
];

async function listPublicRepositories(root) {
  const directory = path.join(root, '.nucleus', 'projects');
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const records = await Promise.all(
    entries
      .filter(
        (entry) => entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name),
      )
      .map(async (entry) => {
        const projectDirectory = path.join(directory, entry.name);
        const record = JSON.parse(
          await readFile(path.join(projectDirectory, 'project.json'), 'utf8'),
        );
        if (
          !record ||
          record.id !== `repository:${entry.name}` ||
          typeof record.name !== 'string' ||
          typeof record.url !== 'string'
        ) {
          throw Error(`Invalid imported repository record: ${entry.name}`);
        }

        const sourceDirectory = path.join(projectDirectory, 'source');
        const files = await readdir(sourceDirectory, { withFileTypes: true });
        const filenames = new Set(
          files.filter((file) => file.isFile()).map((file) => file.name),
        );
        const packageMetadata = await readPackageMetadata(sourceDirectory);
        return {
          ...record,
          version:
            typeof packageMetadata.version === 'string'
              ? packageMetadata.version
              : 'Default branch',
          description:
            typeof packageMetadata.description === 'string'
              ? packageMetadata.description
              : `Public GitHub repository: ${record.owner}/${record.name}.`,
          directory: `.nucleus/projects/${entry.name}/source`,
          source: 'github',
          composeFile:
            composeFilenames.find((name) => filenames.has(name)) || null,
          // Without a Compose file, a root Dockerfile lets Nucleus generate one.
          dockerfile: filenames.has('Dockerfile') ? 'Dockerfile' : null,
          launchable:
            composeFilenames.some((name) => filenames.has(name)) ||
            filenames.has('Dockerfile'),
        };
      }),
  );
  return records.sort((a, b) => a.name.localeCompare(b.name));
}

async function readPackageMetadata(directory) {
  try {
    return JSON.parse(
      await readFile(path.join(directory, 'package.json'), 'utf8'),
    );
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    if (error instanceof SyntaxError) return {};
    throw error;
  }
}

module.exports = { listPublicRepositories };
