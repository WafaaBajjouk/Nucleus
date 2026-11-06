const { readFile } = require('node:fs/promises');
const path = require('node:path');

const pageDirectory = path.join(__dirname, 'pages');
const sectionDirectory = path.join(__dirname, 'sections');
const sections = new Set([
  'sidebar',
  'header',
  'heading',
  'notice',
  'stats',
  'projects',
  'footer',
  'instances',
  'graph-toolbar',
  'graph-canvas',
  'add-project',
]);

async function renderPage(filename) {
  const template = await readFile(path.join(pageDirectory, filename), 'utf8');
  const markers = [...template.matchAll(/<!-- section:([a-z-]+) -->/g)];
  const contents = await Promise.all(
    markers.map(async ([, name]) => {
      if (!sections.has(name)) throw new Error(`Unknown section: ${name}`);
      return readFile(path.join(sectionDirectory, `${name}.html`), 'utf8');
    }),
  );
  let index = 0;
  return Buffer.from(
    template.replace(/<!-- section:([a-z-]+) -->/g, () => contents[index++]),
  );
}

module.exports = { renderPage };
