const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  return {
    handlers: {},
    textContent: '',
    disabled: false,
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    },
  };
}

function controller(context) {
  const source = fs
    .readFileSync(
      path.join(__dirname, '../scripts/docker-readiness.js'),
      'utf8',
    )
    .replace('export function', 'function');
  return vm.runInNewContext(source + '\ninitDockerReadiness;', context);
}

test('readiness displays engine guidance and can be checked again', async () => {
  const status = element();
  const check = element();
  const changes = [];
  let ready = false;
  const init = controller({
    document: {
      querySelector(selector) {
        return selector === '#docker-status' ? status : check;
      },
    },
    window: { addEventListener() {} },
    fetch: async () => ({
      ok: true,
      async json() {
        return ready
          ? { ready: true, message: 'Docker Engine and Compose are ready.' }
          : {
              ready: false,
              message: 'Docker is stopped. Start it, then check again.',
            };
      },
    }),
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
  });

  init((result) => changes.push(result));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(check.disabled, false);
  assert.match(status.textContent, /Docker is stopped/);
  assert.equal(changes.at(-1).ready, false);

  ready = true;
  await check.handlers.click();
  assert.equal(status.textContent, 'Docker Engine and Compose are ready.');
  assert.equal(changes.at(-1).ready, true);
});
