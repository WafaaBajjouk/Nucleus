const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');

async function listExamples(directory = path.join(__dirname, '../examples')) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const folders = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith('.') &&
      entry.name !== 'node_modules',
  );
  const projects = await Promise.all(
    folders.map(async (entry) => {
      const files = await readdir(path.join(directory, entry.name), {
        withFileTypes: true,
      });
      const filenames = new Set(
        files.filter((file) => file.isFile()).map((file) => file.name),
      );
      const composeFile =
        [
          'compose.yaml',
          'compose.yml',
          'docker-compose.yaml',
          'docker-compose.yml',
        ].find((name) => filenames.has(name)) || null;
      let metadata = {};
      try {
        metadata = JSON.parse(
          await readFile(
            path.join(directory, entry.name, 'package.json'),
            'utf8',
          ),
        );
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return {
        id: `example:${entry.name}`,
        name: entry.name,
        version:
          typeof metadata.version === 'string' ? metadata.version : 'Local',
        description:
          typeof metadata.description === 'string'
            ? metadata.description
            : 'Local example project.',
        directory: `examples/${entry.name}`,
        source: 'example',
        composeFile,
      };
    }),
  );
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}
module.exports = { listExamples };
