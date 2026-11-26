const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// A tag such as node:22-alpine can later point to other content (L17);
// a digest cannot. Every example must name its base image by digest.
test('example Dockerfiles pin their base image by digest', () => {
  const examples = path.join(__dirname, '../examples');
  const dockerfiles = fs
    .readdirSync(examples)
    .map((name) => path.join(examples, name, 'Dockerfile'))
    .filter((file) => fs.existsSync(file));
  assert.ok(dockerfiles.length >= 4);
  for (const file of dockerfiles) {
    const from = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /^FROM\s/i.test(line));
    assert.ok(from.length, file);
    for (const line of from)
      assert.match(line, /@sha256:[a-f0-9]{64}\b/, `${file}: ${line}`);
  }
});
