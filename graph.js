const projects = [
  {
    id: 'storefront',
    name: 'Storefront',
    version: 'v2.4.0',
    services: ['Web app', 'API', 'PostgreSQL'],
  },
  {
    id: 'atlas',
    name: 'Atlas API',
    version: 'v1.8.2',
    services: ['API', 'PostgreSQL'],
  },
  {
    id: 'pulse',
    name: 'Pulse Analytics',
    version: 'v0.9.1',
    services: ['Dashboard', 'Worker', 'Redis', 'PostgreSQL'],
  },
];

const graph = document.querySelector('#project-graph');
const details = document.querySelector('#graph-details');
const workspace = graph.querySelector('.workspace-node');
const projectNodes = [...graph.querySelectorAll('[data-project]')];
const savedServices = new Map();
let selectedProject = projects[0];
let drag = null;
let suppressClick = false;

function position(node, x, y) {
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

function drawEdges() {
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

function rememberServices() {
  savedServices.set(
    selectedProject.id,
    [...graph.querySelectorAll('.service-node')].map((node) => ({
      x: node.offsetLeft,
      y: node.offsetTop,
    })),
  );
}

function selectProject(project) {
  rememberServices();
  selectedProject = project;
  projectNodes.forEach((node) =>
    node.setAttribute(
      'aria-pressed',
      String(node.dataset.project === project.id),
    ),
  );
  const services = graph.querySelector('.service-nodes');
  services.replaceChildren();
  project.services.forEach((service, index) => {
    const node = document.createElement('button');
    node.className = 'graph-node service-node';
    node.textContent = service;
    node.setAttribute(
      'aria-label',
      `${service}, ${project.name} service. Use arrow keys to move.`,
    );
    services.append(node);
    const saved = savedServices.get(project.id)?.[index];
    position(node, saved?.x ?? 600, saved?.y ?? 67 + index * 80);
  });
  details.textContent = `${project.name} · ${project.version} · ${project.services.length} services. Sample configuration; launching is not connected yet.`;
  drawEdges();
}

workspace.tabIndex = 0;
workspace.setAttribute(
  'aria-label',
  'Nucleus workspace. Use arrow keys to move.',
);
projectNodes.forEach((node) => {
  node.addEventListener('click', (event) => {
    if (!suppressClick || event.detail === 0)
      selectProject(
        projects.find((project) => project.id === node.dataset.project),
      );
  });
});

graph.addEventListener('pointerdown', (event) => {
  const node = event.target.closest('.graph-node');
  if (!node || !event.isPrimary || event.button !== 0) return;
  suppressClick = false;
  drag = {
    node,
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: node.offsetLeft,
    top: node.offsetTop,
  };
  node.setPointerCapture(event.pointerId);
  node.focus({ preventScroll: true });
});

graph.addEventListener('pointermove', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!suppressClick && Math.hypot(dx, dy) < 4) return;
  suppressClick = true;
  drag.node.classList.add('dragging');
  position(drag.node, drag.left + dx, drag.top + dy);
  drawEdges();
});

function finishDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag.node.classList.remove('dragging');
  if (drag.node.hasPointerCapture(event.pointerId))
    drag.node.releasePointerCapture(event.pointerId);
  drag = null;
  rememberServices();
}
graph.addEventListener('pointerup', finishDrag);
graph.addEventListener('pointercancel', finishDrag);
graph.addEventListener('lostpointercapture', finishDrag);
graph.addEventListener('keydown', (event) => {
  const node = event.target.closest('.graph-node');
  const direction = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[event.key];
  if (!node || !direction) return;
  event.preventDefault();
  const step = event.shiftKey ? 30 : 10;
  position(
    node,
    node.offsetLeft + direction[0] * step,
    node.offsetTop + direction[1] * step,
  );
  rememberServices();
  drawEdges();
});

document.querySelector('#reset-layout').addEventListener('click', () => {
  savedServices.clear();
  position(workspace, 50, 177);
  projectNodes.forEach((node, index) => position(node, 320, 57 + index * 120));
  graph.querySelector('.service-nodes').replaceChildren();
  selectProject(selectedProject);
});
selectProject(selectedProject);
