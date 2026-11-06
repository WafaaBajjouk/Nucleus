const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../theme.js'), 'utf8');

function setup(saved, blocked = false) {
  const listeners = {},
    browserEvents = {},
    attributes = {};
  const button = {
    setAttribute(key, value) {
      attributes[key] = value;
    },
    addEventListener(key, handler) {
      listeners[key] = handler;
    },
  };
  const root = { dataset: {} },
    meta = {},
    writes = [];
  const document = {
    documentElement: root,
    querySelector: () => meta,
    querySelectorAll: () => [button],
    addEventListener(key, handler) {
      listeners[key] = handler;
    },
  };
  vm.runInNewContext(script, {
    document,
    window: {
      addEventListener(key, handler) {
        browserEvents[key] = handler;
      },
    },
    localStorage: {
      getItem() {
        if (blocked) throw Error('Storage blocked');
        return saved;
      },
      setItem(key, value) {
        if (blocked) throw Error('Storage blocked');
        writes.push([key, value]);
      },
    },
  });
  listeners.DOMContentLoaded();
  return { root, meta, attributes, writes, listeners, browserEvents };
}

test('dark is default; switch changes both theme and accessible state and saves preference', () => {
  const ui = setup(null);
  assert.equal(ui.root.dataset.theme, 'dark');
  assert.equal(ui.attributes['aria-checked'], 'true');
  ui.listeners.click();
  assert.equal(ui.root.dataset.theme, 'light');
  assert.equal(ui.attributes['aria-checked'], 'false');
  assert.deepEqual(ui.writes[0], ['nucleus-theme', 'light']);
  ui.listeners.click();
  assert.equal(ui.root.dataset.theme, 'dark');
});
test('stored preference is applied and other tabs can update it', () => {
  const ui = setup('light');
  assert.equal(ui.root.dataset.theme, 'light');
  ui.browserEvents.storage({ key: 'nucleus-theme', newValue: 'dark' });
  assert.equal(ui.root.dataset.theme, 'dark');
});
test('theme switch still works if storage is blocked', () => {
  const ui = setup(null, true);
  assert.equal(ui.root.dataset.theme, 'dark');
  assert.doesNotThrow(() => ui.listeners.click());
  assert.equal(ui.root.dataset.theme, 'light');
});
