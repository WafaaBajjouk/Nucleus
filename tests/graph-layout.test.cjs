const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layout = import(
  'data:text/javascript;base64,' +
    fs
      .readFileSync(path.join(__dirname, '../scripts/graph/layout.js'))
      .toString('base64')
);
function node() {
  return { offsetWidth: 150, offsetHeight: 66, style: {} };
}

test('account is centered, with 18 non-overlapping project cards around it', async () => {
  const { arrangeProjects } = await layout;
  const graph = {
    style: {},
    querySelector: () => ({ setAttribute() {} }),
    get clientWidth() {
      return parseFloat(this.style.width);
    },
    get clientHeight() {
      return parseFloat(this.style.height);
    },
  };
  const workspace = node();
  const projectNodes = Array.from({ length: 18 }, node);
  arrangeProjects({ graph, workspace, projectNodes });
  assert.equal(parseFloat(workspace.style.left) + 75, graph.clientWidth / 2);
  assert.equal(parseFloat(workspace.style.top) + 33, graph.clientHeight / 2);
  const all = [workspace, ...projectNodes];
  for (let i = 0; i < all.length; i++) {
    const x = parseFloat(all[i].style.left),
      y = parseFloat(all[i].style.top);
    assert.ok(
      x >= 0 &&
        x + 150 <= graph.clientWidth &&
        y >= 45 &&
        y + 66 <= graph.clientHeight,
    );
    for (let j = i + 1; j < all.length; j++) {
      assert.ok(
        Math.abs(x - parseFloat(all[j].style.left)) >= 150 ||
          Math.abs(y - parseFloat(all[j].style.top)) >= 66,
        'Cards should not overlap',
      );
    }
  }
});
