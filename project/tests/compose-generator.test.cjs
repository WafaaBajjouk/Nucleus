const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateCompose } = require('../services/compose-generator.cjs');

const source = '/repo/source';
const app = (dockerfile) => generateCompose(dockerfile, source).services.app;

test('port comes from EXPOSE and health check from HEALTHCHECK', () => {
  const service = app(`FROM node:22-alpine
EXPOSE 3000
HEALTHCHECK --interval=5s --retries=3 \\
  CMD ["node", "-e", "process.exit(0)"]
CMD ["node", "server.js"]`);
  assert.deepEqual(service.build, { context: source, dockerfile: 'Dockerfile' });
  assert.deepEqual(service.ports, [
    { target: 3000, host_ip: '127.0.0.1', published: '0', protocol: 'tcp' },
  ]);
  assert.deepEqual(service.healthcheck, {
    interval: '5s',
    retries: 3,
    test: ['CMD', 'node', '-e', 'process.exit(0)'],
  });
});

test('shell-form HEALTHCHECK and the final build stage are used', () => {
  const service = app(`FROM node:22 AS build
EXPOSE 9999
HEALTHCHECK CMD exit 1
FROM node:22-alpine
# runtime stage
EXPOSE 8080/tcp
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ || exit 1`);
  assert.equal(service.ports[0].target, 8080);
  assert.deepEqual(service.healthcheck.test, [
    'CMD-SHELL',
    'wget -qO- http://127.0.0.1:8080/ || exit 1',
  ]);
});

test('Dockerfiles Nucleus cannot read safely are refused with a reason', () => {
  const cases = [
    ['FROM x\nHEALTHCHECK CMD true', /EXPOSE exactly one TCP port/],
    ['FROM x\nEXPOSE 3000 4000\nHEALTHCHECK CMD true', /EXPOSE exactly one/],
    ['FROM x\nEXPOSE $PORT\nHEALTHCHECK CMD true', /EXPOSE exactly one/],
    ['FROM x\nEXPOSE 53/udp\nHEALTHCHECK CMD true', /EXPOSE exactly one/],
    ['FROM x\nEXPOSE 3000', /no HEALTHCHECK/],
    ['FROM x\nEXPOSE 3000\nHEALTHCHECK NONE', /no HEALTHCHECK/],
    ['FROM x\nEXPOSE 3000\nHEALTHCHECK CMD ["broken"', /could not read/],
    ['FROM x\nEXPOSE 3000\nHEALTHCHECK --bogus=1 CMD true', /could not read/],
  ];
  for (const [dockerfile, message] of cases) {
    assert.throws(() => generateCompose(dockerfile, source), (error) => {
      assert.equal(error.status, 400);
      assert.match(error.message, message);
      return true;
    }, dockerfile);
  }
});
