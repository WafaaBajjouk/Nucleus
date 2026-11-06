export function position(graph, node, x, y) {
  node.style.left = `${Math.max(0, Math.min(graph.clientWidth - node.offsetWidth, x))}px`;
  node.style.top = `${Math.max(45, Math.min(graph.clientHeight - node.offsetHeight, y))}px`;
}

export function arrangeProjects(state) {
  const { graph, workspace, projectNodes } = state;
  // Give each card room on the horizontal and vertical parts of the ring.
  const radiusX = Math.max(280, (projectNodes.length * 240) / (2 * Math.PI));
  const radiusY = Math.max(200, (projectNodes.length * 190) / (2 * Math.PI));
  const width = Math.ceil(radiusX * 2 + 220);
  const height = Math.ceil(radiusY * 2 + 220);
  graph.style.width = `${width}px`;
  graph.style.height = `${height}px`;
  graph.querySelector('svg').setAttribute('viewBox', `0 0 ${width} ${height}`);
  const centerX = width / 2;
  const centerY = height / 2;
  position(
    graph,
    workspace,
    centerX - workspace.offsetWidth / 2,
    centerY - workspace.offsetHeight / 2,
  );
  projectNodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / projectNodes.length;
    position(
      graph,
      node,
      centerX + Math.cos(angle) * radiusX - node.offsetWidth / 2,
      centerY + Math.sin(angle) * radiusY - node.offsetHeight / 2,
    );
  });
}

export function centerGraph(state) {
  const viewport = state.graph.parentElement;
  viewport.scrollTo(
    Math.max(0, (state.graph.clientWidth - viewport.clientWidth) / 2),
    Math.max(0, (state.graph.clientHeight - viewport.clientHeight) / 2),
  );
}

function connect(group, source, target) {
  const sx = source.offsetLeft + source.offsetWidth / 2;
  const sy = source.offsetTop + source.offsetHeight / 2;
  const tx = target.offsetLeft + target.offsetWidth / 2;
  const ty = target.offsetTop + target.offsetHeight / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const sourceScale =
    1 /
    Math.max(
      Math.hypot(dx / (source.offsetWidth / 2), dy / (source.offsetHeight / 2)),
      1,
    );
  const targetScale =
    1 /
    Math.max(
      Math.hypot(dx / (target.offsetWidth / 2), dy / (target.offsetHeight / 2)),
      1,
    );
  const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  edge.setAttribute(
    'd',
    `M ${sx + dx * sourceScale} ${sy + dy * sourceScale} L ${tx - dx * targetScale} ${ty - dy * targetScale}`,
  );
  group.append(edge);
}

export function drawEdges(state) {
  const { graph, workspace, projectNodes } = state;
  const edges = graph.querySelector('.workspace-edges');
  edges.replaceChildren();
  projectNodes.forEach((node) => connect(edges, workspace, node));
}
