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
function node(width = 116, height = 116) {
  return { offsetWidth: width, offsetHeight: height, style: {} };
}

test('workspace is centered, with 18 non-overlapping project nodes around it', async () => {
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
  const workspace = node(168, 168);
  const projectNodes = Array.from({ length: 18 }, () => node());
  arrangeProjects({ graph, workspace, projectNodes });
  assert.equal(parseFloat(workspace.style.left) + 84, graph.clientWidth / 2);
  assert.equal(parseFloat(workspace.style.top) + 84, graph.clientHeight / 2);
  const all = [workspace, ...projectNodes];
  for (let i = 0; i < all.length; i++) {
    const x = parseFloat(all[i].style.left),
      y = parseFloat(all[i].style.top);
    assert.ok(
      x >= 0 &&
        x + all[i].offsetWidth <= graph.clientWidth &&
        y >= 45 &&
        y + all[i].offsetHeight <= graph.clientHeight,
    );
    for (let j = i + 1; j < all.length; j++) {
      assert.ok(
        x + all[i].offsetWidth <= parseFloat(all[j].style.left) ||
          parseFloat(all[j].style.left) + all[j].offsetWidth <= x ||
          y + all[i].offsetHeight <= parseFloat(all[j].style.top) ||
          parseFloat(all[j].style.top) + all[j].offsetHeight <= y,
        'Project nodes should not overlap',
      );
    }
  }
});

test('connections meet the circular node boundaries', async (t) => {
  const { drawEdges } = await layout;
  const previous = global.document;
  t.after(() => {
    global.document = previous;
  });
  const paths = [];
  global.document = {
    createElementNS() {
      return {
        setAttribute(name, value) {
          this[name] = value;
        },
      };
    },
  };
  const graph = {
    querySelector() {
      return {
        replaceChildren() {
          paths.length = 0;
        },
        append(edge) {
          paths.push(edge);
        },
      };
    },
  };
  const workspace = {
    offsetLeft: 0,
    offsetTop: 0,
    offsetWidth: 168,
    offsetHeight: 168,
  };
  const planet = {
    offsetLeft: 300,
    offsetTop: 200,
    offsetWidth: 116,
    offsetHeight: 116,
  };
  drawEdges({ graph, workspace, projectNodes: [planet] });
  const [x1, y1, x2, y2] = paths[0].d.match(/[\d.]+/g).map(Number);
  assert.ok(Math.abs(Math.hypot(x1 - 84, y1 - 84) - 84) < 0.001);
  assert.ok(Math.abs(Math.hypot(x2 - 358, y2 - 258) - 58) < 0.001);
});
