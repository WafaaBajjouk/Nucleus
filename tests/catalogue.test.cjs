const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Minimal DOM boundary: execute the real page controllers without a browser.
function element() {
  return {
    dataset: {},
    children: [],
    handlers: {},
    attributes: {},
    value: '',
    textContent: '',
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    remove() {},
  };
}
function controller(filename, name, context) {
  const source = fs
    .readFileSync(path.join(__dirname, '..', filename), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export function', 'function');
  return vm.runInNewContext(source + `\n${name};`, context);
}
const project = {
  id: 'example:TaskNest',
  name: 'TaskNest',
  version: '1.0.0',
  description: 'A task tracker',
  directory: 'examples/TaskNest',
  composeFile: 'compose.yaml',
  source: 'example',
};

test('dashboard derives counts, cards and search from the shared local catalogue', async () => {
  const nodes = Object.fromEntries(
    [
      '#project-list',
      '#project-status',
      '#project-search',
      '#refresh-projects',
      '#project-total',
      '#compose-total',
    ].map((key) => [key, element()]),
  );
  const document = {
    querySelector: (key) => nodes[key],
    createElement: element,
  };
  let calls = 0;
  const init = controller(
    'scripts/dashboard/projects.js',
    'initProjectCatalogue',
    {
      document,
      loadExampleProjects: async () => {
        calls++;
        return [project];
      },
    },
  );
  await init();
  assert.equal(calls, 1);
  assert.equal(nodes['#project-total'].textContent, 1);
  assert.equal(nodes['#compose-total'].textContent, 1);
  assert.equal(nodes['#project-list'].children.length, 1);
  const card = nodes['#project-list'].children[0];
  assert.equal(card.children[1].textContent, 'TaskNest');
  assert.match(card.children.at(-1).href, /project=example%3ATaskNest/);
  nodes['#project-search'].value = 'missing';
  nodes['#project-search'].handlers.input();
  assert.equal(nodes['#project-list'].children.length, 0);
  assert.equal(
    nodes['#project-status'].textContent,
    'No projects match your search.',
  );
  assert.equal(nodes['#project-total'].textContent, 1);
});

test('graph loads the demo workspace from the shared local catalogue', async () => {
  const nodes = Object.fromEntries(
    ['#local-projects', '#graph-status'].map((key) => [key, element()]),
  );
  const workspace = element();
  const labels = { strong: element(), small: element() };
  workspace.querySelector = (key) => labels[key];
  const graph = element();
  const state = {
    graph,
    workspace,
    projects: [],
    projectNodes: [],
    selectedProject: null,
  };
  let localCalls = 0;
  const init = controller('scripts/graph/import.js', 'initGraphImport', {
    document: { querySelector: (key) => nodes[key], createElement: element },
    window: { location: { search: '?project=example%3ATaskNest' } },
    URLSearchParams,
    loadExampleProjects: async () => {
      localCalls++;
      return [project];
    },
    arrangeProjects() {},
    drawEdges() {},
    centerGraph() {},
  });
  await init(state, {
    selectProject(selected) {
      state.selectedProject = selected;
    },
  });
  assert.equal(localCalls, 1);
  assert.equal(state.projectNodes.length, 1);
  assert.equal(state.selectedProject.name, 'TaskNest');
  assert.equal(labels.strong.textContent, 'Nucleus');
  assert.match(nodes['#graph-status'].textContent, /1 demo projects/);
  assert.equal(nodes['#local-projects'].disabled, false);
});

test('dashboard reports local source errors without inventing project counts', async () => {
  const nodes = Object.fromEntries(
    [
      '#project-list',
      '#project-status',
      '#project-search',
      '#refresh-projects',
      '#project-total',
      '#compose-total',
    ].map((key) => [key, element()]),
  );
  const init = controller(
    'scripts/dashboard/projects.js',
    'initProjectCatalogue',
    {
      document: { querySelector: (key) => nodes[key], createElement: element },
      loadExampleProjects: async () => {
        throw Error('Unavailable');
      },
    },
  );
  await init();
  assert.match(nodes['#project-status'].textContent, /Unavailable.*retry/);
  assert.equal(nodes['#project-total'].textContent, '');
  assert.equal(nodes['#project-list'].children.length, 0);
  assert.equal(nodes['#refresh-projects'].disabled, false);
});
