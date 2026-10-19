const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listRepositories } = require('../services/github.cjs');
const repo = (name, privateRepo = false) => ({
  id: name,
  name,
  owner: { login: 'alice' },
  private: privateRepo,
  default_branch: 'main',
});
const ok = (item) => ({ ok: true, json: async () => item });

test('only allowlisted repositories are requested with the token', async () => {
  const calls = [];
  const result = await listRepositories(
    'ALICE',
    async (url, options) => {
      calls.push(url);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.match(
        url,
        /^https:\/\/api.github.com\/repos\/alice\/(public|private)$/,
      );
      return ok(repo(url.split('/').pop(), url.endsWith('/private')));
    },
    'test-token',
    'alice/public, alice/private, ALICE/PUBLIC, other/hidden',
  );
  assert.equal(calls.length, 2);
  assert.equal(result.length, 2);
  assert.equal(result.filter((item) => item.private).length, 1);
  assert.ok(!JSON.stringify(result).includes('test-token'));
});

test('missing token, missing list, and invalid configuration fail closed without network calls', async () => {
  const noFetch = () => {
    throw new Error('Unexpected request');
  };
  for (const [token, list] of [
    ['', 'alice/repo'],
    ['test-token', ''],
    ['test-token', '../bad'],
  ]) {
    await assert.rejects(listRepositories('alice', noFetch, token, list), {
      status: 503,
    });
  }
  await assert.rejects(
    listRepositories('../bad', noFetch, 'test-token', 'alice/repo'),
    { status: 400 },
  );
});

test('other account graphs cannot include configured repositories', async () => {
  assert.deepEqual(
    await listRepositories(
      'bob',
      () => {
        throw new Error('Unexpected request');
      },
      'test-token',
      'alice/repo',
    ),
    [],
  );
});

test('invalid token or denied repository fails without returning a partial graph', async () => {
  for (const [status, expected] of [
    [401, 401],
    [403, 429],
    [429, 429],
    [404, 404],
    [500, 502],
  ]) {
    let calls = 0;
    await assert.rejects(
      listRepositories(
        'alice',
        async () =>
          ++calls === 1 ? ok(repo('public')) : { ok: false, status },
        'test-token',
        'alice/public,alice/private',
      ),
      (error) => {
        assert.equal(error.status, expected);
        assert.ok(!error.message.includes('test-token'));
        return true;
      },
    );
  }
});

test('renamed or transferred repositories must be explicitly configured again', async () => {
  await assert.rejects(
    listRepositories(
      'alice',
      async () => ok(repo('unlisted')),
      'test-token',
      'alice/selected',
    ),
    { status: 409 },
  );
});
