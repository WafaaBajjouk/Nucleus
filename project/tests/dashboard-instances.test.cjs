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
      metrics: { cpuPercent: 2.5, memoryUsage: '10MiB / 1GiB' },
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
  const firstDetails = nodes['#instance-list'].children[0].children[1];
  const metrics = firstDetails.children.find(
    (child) => child.className === 'instance-resource-metrics',
  );
  assert.deepEqual(
    metrics.children.map((metric) => metric.textContent),
    ['CPU 2.5%', 'Memory 10MiB / 1GiB'],
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

test('rows offer Stop for a ready app and Start for a stopped one', async () => {
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
    { id: 'a', name: 'TaskNest', runtimeStatus: 'up', status: 'ready', health: 'healthy', url: null },
    { id: 'b', name: 'JsonDesk', runtimeStatus: 'down', status: 'stopped', url: null },
    { id: 'c', name: 'UnitLab', runtimeStatus: 'failed', status: 'failed', url: null },
  ];
  const source = fs
    .readFileSync(path.join(__dirname, '../scripts/dashboard/instances.js'), 'utf8')
    .replace('export function', 'function');
  const init = vm.runInNewContext(source + '\ninitInstanceOverview;', {
    document: {
      querySelector: (key) => nodes[key],
      createElement: element,
      createTextNode: (text) => ({ textContent: text }),
    },
    window: { addEventListener() {} },
    fetch: async () => ({ ok: true, json: async () => instances }),
    setTimeout() {},
    clearTimeout() {},
  });
  await init();

  const rows = nodes['#instance-list'].children;
  const control = (row) =>
    row.children.find((child) => child.className === 'instance-control');
  assert.equal(control(rows[0]).textContent, 'Stop');
  assert.equal(control(rows[1]).textContent, 'Start');
  assert.equal(control(rows[2]), undefined);
  const badge = rows[1].children.find((child) =>
    String(child.className).startsWith('instance-badge'),
  );
  assert.equal(badge.children.at(-1).textContent, 'Stopped');
});

test('a logs panel opens, shows the text safely and stays open after refresh', async () => {
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
    { id: 'a', name: 'TaskNest', runtimeStatus: 'up', status: 'ready', health: 'healthy', url: null },
  ];
  const clickable = () => {
    const node = element();
    node.handlers = {};
    node.addEventListener = (type, handler) => (node.handlers[type] = handler);
    return node;
  };
  let refresh;
  const source = fs
    .readFileSync(path.join(__dirname, '../scripts/dashboard/instances.js'), 'utf8')
    .replace('export function', 'function');
  const init = vm.runInNewContext(source + '\ninitInstanceOverview;', {
    document: {
      querySelector: (key) => nodes[key],
      createElement: clickable,
      createTextNode: (text) => ({ textContent: text }),
    },
    window: { addEventListener() {} },
    fetch: async (url) => ({
      ok: true,
      json: async () =>
        url.endsWith('/logs')
          ? { id: 'a', source: 'docker', truncated: false, text: '<b>listening</b>' }
          : instances,
    }),
    setTimeout(callback) {
      refresh = callback;
    },
    clearTimeout() {},
  });
  await init();

  const row = () => nodes['#instance-list'].children[0];
  const toggle = () =>
    row().children.find((child) => child.className === 'instance-logs-toggle');
  const panel = () =>
    row().children[1].children.find((child) => child.className === 'instance-logs');
  assert.equal(toggle().textContent, 'Logs');
  await toggle().handlers.click();
  assert.equal(panel().textContent, '<b>listening</b>');
  assert.equal(toggle().textContent, 'Hide logs');
  await refresh();
  assert.equal(panel().textContent, '<b>listening</b>');
  await toggle().handlers.click();
  assert.equal(panel(), undefined);
});
