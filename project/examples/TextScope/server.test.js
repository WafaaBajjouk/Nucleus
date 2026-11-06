const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleRequest } = require('./server');
async function request(body, url = '/api/run', method = 'POST', raw = false) {
  const result = {};
  const request = {
    url,
    method,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(raw ? body : JSON.stringify(body));
    },
  };
  await handleRequest(request, {
    writeHead(status) {
      result.status = status;
    },
    end(data) {
      result.data = JSON.parse(data);
    },
  });
  return result;
}
test('tool produces real results', async () => {
  const result = await request({ text: 'Hello world\n\nNext paragraph' });
  assert.equal(result.status, 200);
  assert.equal(result.data.words, 4);
  assert.equal(result.data.paragraphs, 2);
  assert.equal(result.data.lines, 3);
  assert.equal((await request({ text: '' })).data.words, 0);
  assert.equal((await request({ text: '😀' })).data.characters, 1);
});
test('invalid requests and oversized documents are rejected', async () => {
  assert.equal((await request({ text: 12 })).status, 400);
  assert.equal((await request('{', '/api/run', 'POST', true)).status, 400);
  assert.equal((await request({ text: 'x'.repeat(65537) })).status, 413);
  assert.equal((await request({}, '/api/run', 'GET')).status, 405);
});
test('health and missing routes', async () => {
  assert.equal((await request({}, '/health', 'GET')).data.status, 'ok');
  assert.equal((await request({}, '/missing', 'GET')).status, 404);
});
