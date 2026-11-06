const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleRequest } = require('./server');
async function request(url, method = 'GET') {
  const result = {};
  await handleRequest(
    { url, method },
    {
      writeHead(status) {
        result.status = status;
      },
      end(body) {
        result.data = JSON.parse(body);
      },
    },
  );
  return result;
}
test('conversion API computes real distances', async () => {
  assert.equal(
    (await request('/api/convert?value=1&from=km&to=m')).data.result,
    1000,
  );
  assert.equal(
    (await request('/api/convert?value=1&from=mi&to=m')).data.result,
    1609.344,
  );
  assert.equal(
    (await request('/api/convert?value=0&from=ft&to=m')).data.result,
    0,
  );
});
test('invalid input is rejected rather than returning a misleading result', async () => {
  for (const query of [
    'value=-1&from=m&to=ft',
    'value=abc&from=m&to=km',
    'value=&from=m&to=km',
    'value=1&from=unknown&to=m',
    'value=1&from=__proto__&to=m',
    'value=Infinity&from=m&to=m',
  ]) {
    assert.equal((await request('/api/convert?' + query)).status, 400);
  }
});
test('health and unsupported routes behave correctly', async () => {
  assert.equal((await request('/health')).data.status, 'ok');
  assert.equal((await request('/missing')).status, 404);
  assert.equal((await request('/api/convert', 'POST')).status, 405);
});
