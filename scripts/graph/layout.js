export function position(graph, node, x, y) {
  node.style.left = `${Math.max(0, Math.min(graph.clientWidth - node.offsetWidth, x))}px`;
  node.style.top = `${Math.max(45, Math.min(graph.clientHeight - node.offsetHeight, y))}px`;
}

function connect(group, source, target) {
  const x1 = source.offsetLeft + source.offsetWidth;
  const y1 = source.offsetTop + source.offsetHeight / 2;
  const x2 = target.offsetLeft;
  const y2 = target.offsetTop + target.offsetHeight / 2;
  const middle = (x1 + x2) / 2;
  const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  edge.setAttribute(
    'd',
    `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`,
  );
  group.append(edge);
}

export function drawEdges(state) {
  const { graph, workspace, projectNodes, selectedProject } = state;
  const workspaceEdges = graph.querySelector('.workspace-edges');
  const serviceEdges = graph.querySelector('.service-edges');
  workspaceEdges.replaceChildren();
  serviceEdges.replaceChildren();
  projectNodes.forEach((node) => connect(workspaceEdges, workspace, node));
  const selected = projectNodes.find(
    (node) => node.dataset.project === selectedProject.id,
  );
  graph
    .querySelectorAll('.service-node')
    .forEach((node) => connect(serviceEdges, selected, node));
}
