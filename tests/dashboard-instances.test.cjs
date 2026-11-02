const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  return {
    children: [],
    attributes: {},
    style: {},
    textContent: '',
    append(...children) {
      this.children.push(...children);
    },
    addEventListener() {},
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

test('overview renders running and not-up totals, distribution and real instance rows', async () => {
  const selectors = [
    '#instance-list',
    '#instance-status',
    '#instance-chart',
    '#instances-up',
    '#instances-down',
    '#instances-unknown',
    '#instances-starting',
    '#instances-total',
  ];
  const nodes = Object.fromEntries(selectors.map((key) => [key, element()]));
  const instances = [
    {
      id: 'nucleus-running',
      name: 'TaskNest',
      createdAt: '2026-10-27T10:00:00.000Z',
      runtimeStatus: 'up',
      image: 'nucleus-tasknest',
      health: 'healthy',
      message: 'Application passed its health check.',
      url: 'http://127.0.0.1:45001',
    },
    {
      id: 'nucleus-stopped',
      name: 'JsonDesk',
      createdAt: '2026-10-27T10:00:00.000Z',
      runtimeStatus: 'down',
      url: null,
    },
    {
      id: 'nucleus-failed',
      name: 'UnitLab',
      createdAt: '2026-10-27T10:00:00.000Z',
      runtimeStatus: 'failed',
      url: null,
    },
    {
      id: 'nucleus-starting',
      name: 'JsonDesk',
      createdAt: '2026-10-27T10:00:00.000Z',
      runtimeStatus: 'starting',
      url: null,
    },
  ];
  const source = fs
    .readFileSync(
      path.join(__dirname, '../scripts/dashboard/instances.js'),
      'utf8',
    )
    .replace('export function', 'function');
  const init = vm.runInNewContext(source + '\ninitInstanceOverview;', {
    document: {
      querySelector: (key) => nodes[key],
      createElement: element,
      createTextNode: (text) => ({ textContent: text }),
    },
    window: { addEventListener() {} },
    fetch: async () => ({
      ok: true,
      async json() {
        return instances;
      },
    }),
    setTimeout() {},
    clearTimeout() {},
  });

  await init();

  assert.equal(nodes['#instances-up'].textContent, 1);
  assert.equal(nodes['#instances-down'].textContent, 2);
  assert.equal(nodes['#instances-unknown'].textContent, 0);
  assert.equal(nodes['#instances-starting'].textContent, 1);
  assert.equal(nodes['#instances-total'].textContent, 4);
  assert.deepEqual(
    nodes['#instance-chart'].children.map((segment) => segment.className),
    ['chart-segment up', 'chart-segment down', 'chart-segment starting'],
  );
  assert.equal(nodes['#instance-list'].children.length, 4);
  assert.equal(
    nodes['#instance-list'].children[0].children[0].className,
    'instance-dot up',
  );
  assert.ok(
    nodes['#instance-list'].children[0].children.some((child) =>
      child.children?.some(
        (detail) =>
          detail.className === 'instance-message' &&
          detail.textContent === 'Application passed its health check.',
      ),
    ),
  );
  assert.equal(
    nodes['#instance-list'].children[1].children[0].className,
    'instance-dot down',
  );
  assert.ok(
    nodes['#instance-list'].children[0].children.some(
      (child) => child.textContent === 'Open app ↗',
    ),
  );
});
