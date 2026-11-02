const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function element() {
  return {
    handlers: {},
    disabled: false,
    hidden: false,
    textContent: '',
    value: 'https://github.com/acme/team-service',
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    },
  };
}

test('add-project page submits the repository URL and links to its graph node', async () => {
  const form = element();
  const submit = element();
  const url = element();
  const status = element();
  const graphLink = element();
  form.querySelector = () => submit;
  const nodes = {
    '#repository-form': form,
    '#repository-url': url,
    '#repository-status': status,
    '#repository-graph-link': graphLink,
    '[data-page-title]': element(),
  };
  let request;
  const source = fs
    .readFileSync(path.join(__dirname, '../scripts/add-project.js'), 'utf8')
    .replace(/^import .*;\n/, '');
  let navigationInitialized = false;
  vm.runInNewContext(source, {
    document: { querySelector: (selector) => nodes[selector] },
    initSidebarNavigation() {
      navigationInitialized = true;
    },
    fetch: async (target, options) => {
      request = { target, options };
      return {
        ok: true,
        async json() {
          return {
            id: 'repository:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            name: 'team-service',
          };
        },
      };
    },
  });

  assert.equal(nodes['[data-page-title]'].textContent, 'Add project');
  assert.equal(navigationInitialized, true);
  await form.handlers.submit({ preventDefault() {} });
  assert.equal(request.target, '/api/projects');
  assert.equal(request.options.method, 'POST');
  assert.equal(
    JSON.parse(request.options.body).url,
    'https://github.com/acme/team-service',
  );
  assert.equal(url.value, '');
  assert.equal(status.textContent, 'team-service added from GitHub.');
  assert.equal(graphLink.hidden, false);
  assert.equal(
    graphLink.href,
    'graph.html?project=repository%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  );
  assert.equal(submit.disabled, false);
});
