const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  return {
    children: [],
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      },
    },
    dataset: {},
    handlers: {},
    attributes: {},
    style: {},
    hidden: false,
    offsetWidth: 300,
    offsetHeight: 160,
    textContent: '',
    append(...children) {
      this.children.push(...children);
      for (const child of children) child.parentElement = this;
    },
    replaceChildren(...children) {
      this.children = children;
      for (const child of children) child.parentElement = this;
    },
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    contains(child) {
      return this.children.some(
        (item) => item === child || item.contains?.(child),
      );
    },
    getBoundingClientRect() {
      return { left: 100, right: 200, top: 100, bottom: 150, width: 100 };
    },
  };
}

function controller(filename, name, context) {
  const source = fs
    .readFileSync(path.join(__dirname, '..', filename), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export function', 'function');
  return vm.runInNewContext(source + `\n${name};`, context);
}

test('project tooltip launches its own project and renders the app link', async () => {
  const list = element();
  const node = element();
  node.dataset.project = 'example:JsonDesk';
  node.querySelector = () => ({ textContent: 'JsonDesk' });
  const graph = element();
  graph.parentElement = element();
  const workspace = element();
  const instances = [
    {
      id: 'nucleus-11111111-1111-4111-8111-111111111111',
      projectId: 'example:JsonDesk',
      name: 'JsonDesk',
      image: 'nucleus-jsondesk',
      runtimeStatus: 'up',
      health: 'healthy',
      message: 'Application passed its health check.',
      url: 'http://127.0.0.1:49152',
    },
  ];
  let getCount = 0;
  let launchRequest;
  const body = element();
  const context = {
    document: {
      querySelector: () => list,
      createElement: element,
      body,
      activeElement: null,
      addEventListener() {},
    },
    window: {
      addEventListener() {},
      innerWidth: 1200,
      innerHeight: 800,
    },
    MutationObserver: class {
      observe() {}
    },
    fetch: async (url, options = {}) => {
      if (options.method === 'POST') {
        launchRequest = { url, body: JSON.parse(options.body) };
        return {
          ok: true,
          async json() {
            return { id: instances[0].id, status: 'starting' };
          },
        };
      }
      getCount++;
      return {
        ok: true,
        async json() {
          return getCount === 1 ? [] : instances;
        },
      };
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    position() {},
    drawEdges() {},
  };
  const state = {
    graph,
    workspace,
    projects: [
      {
        id: 'example:JsonDesk',
        name: 'JsonDesk',
        composeFile: 'compose.yaml',
      },
      {
        id: 'example:TaskNest',
        name: 'TaskNest',
        composeFile: 'compose.yaml',
      },
    ],
    projectNodes: [node],
    selectedProject: { id: 'example:TaskNest', name: 'TaskNest' },
  };

  controller('scripts/graph/details.js', 'initNodeDetails', context)(state);
  controller('scripts/graph/launch.js', 'initGraphLaunch', context)(state);
  await new Promise((resolve) => setImmediate(resolve));

  graph.handlers.pointerover({
    pointerType: 'mouse',
    target: { closest: () => node },
    relatedTarget: null,
  });
  state.onDockerReadinessChange({ ready: true });
  assert.equal(state.tooltipProject.id, 'example:JsonDesk');
  assert.ok(state.tooltip.contains(state.tooltipLaunch));
  assert.equal(state.tooltipLaunch.disabled, false);
  // The graph selection is TaskNest; the button must name the hovered target.
  assert.equal(state.tooltipLaunch.textContent, 'Launch JsonDesk');
  await state.tooltipLaunch.handlers.click();

  assert.deepEqual(launchRequest, {
    url: '/api/instances',
    body: { projectId: 'example:JsonDesk' },
  });
  assert.equal(state.tooltipLaunch.disabled, false);
  assert.equal(state.tooltipLaunch.textContent, 'Launch JsonDesk');
  assert.equal(state.tooltipAppLink.hidden, false);
  assert.equal(state.tooltipAppLink.href, 'http://127.0.0.1:49152');
  assert.equal(list.children.length, 1);
  assert.equal(node.attributes['aria-label'], 'JsonDesk: 1 instance up');
  assert.equal(node.classList.contains('has-running-instance'), true);

  state.onInstancesUpdate([
    { projectId: 'example:JsonDesk', runtimeStatus: 'down' },
  ]);
  assert.equal(node.classList.contains('has-running-instance'), false);
  assert.equal(node.classList.contains('has-stopped-instance'), true);
});
