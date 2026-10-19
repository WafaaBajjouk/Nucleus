// Preview fixtures only. Replace with permission-checked API responses later.
const instances = [
  {
    name: 'storefront-dev',
    project: 'Storefront',
    icon: 'S',
    color: 'purple',
    status: 'running',
    version: 'v2.4.0',
    cpu: '12%',
    memory: '1.4 GB',
    verification: 'Passed',
  },
  {
    name: 'atlas-api-dev',
    project: 'Atlas API',
    icon: 'A',
    color: 'orange',
    status: 'running',
    version: 'v1.8.2',
    cpu: '8%',
    memory: '0.9 GB',
    verification: 'Passed',
  },
  {
    name: 'pulse-staging',
    project: 'Pulse Analytics',
    icon: 'P',
    color: 'blue',
    status: 'stopped',
    version: 'v0.9.1',
    cpu: '—',
    memory: '—',
    verification: 'Not run',
  },
  {
    name: 'storefront-preview',
    project: 'Storefront',
    icon: 'S',
    color: 'purple',
    status: 'running',
    version: 'v2.3.1',
    cpu: '4%',
    memory: '0.9 GB',
    verification: 'Passed',
  },
];

let statusFilter = 'all';
const search = document.querySelector('#instance-search');
const rows = document.querySelector('#instance-rows');

function renderInstances() {
  const query = search.value.trim().toLowerCase();
  const visible = instances.filter(
    (instance) =>
      (statusFilter === 'all' || instance.status === statusFilter) &&
      `${instance.name} ${instance.project}`.toLowerCase().includes(query),
  );
  rows.replaceChildren(
    ...visible.map((instance) => {
      const row = document.createElement('tr');
      // All markup values below come from the fixed fixtures above, never user input.
      row.innerHTML = `<td><div class="instance-name"><span class="project-icon ${instance.color}">${instance.icon}</span><div><strong>${instance.name}</strong><small>${instance.project}</small></div></div></td>
      <td><span class="badge ${instance.status}"><span class="status-dot"></span>${instance.status === 'running' ? 'Running' : 'Stopped'}</span></td>
      <td><code>${instance.version}</code></td><td class="metric">${instance.cpu}</td><td class="metric">${instance.memory}</td>
      <td><span class="verification ${instance.verification === 'Passed' ? 'passed' : ''}">${instance.verification === 'Passed' ? '✓ ' : '− '}${instance.verification}</span></td>`;
      return row;
    }),
  );
  document.querySelector('#empty-state').hidden = visible.length !== 0;
  document.querySelector('#result-count').textContent =
    `Showing ${visible.length} instance${visible.length === 1 ? '' : 's'}`;
}

search.addEventListener('input', renderInstances);
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    statusFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    renderInstances();
  });
});
document.addEventListener('keydown', (event) => {
  if (
    event.key === '/' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.target.closest('input, textarea, [contenteditable]')
  ) {
    event.preventDefault();
    search.focus();
  }
});
renderInstances();

const projects = [
  { id: 'storefront', name: 'Storefront', version: 'v2.4.0', services: ['Web app', 'API', 'PostgreSQL'] },
  { id: 'atlas', name: 'Atlas API', version: 'v1.8.2', services: ['API', 'PostgreSQL'] },
  { id: 'pulse', name: 'Pulse Analytics', version: 'v0.9.1', services: ['Dashboard', 'Worker', 'Redis', 'PostgreSQL'] },
];

const graph = document.querySelector('#project-graph');
const graphDetails = document.querySelector('#graph-details');

function selectProject(project) {
  graph.querySelectorAll('[data-project]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.project === project.id));
  });

  const serviceNodes = graph.querySelector('.service-nodes');
  const edges = graph.querySelector('.service-edges');
  serviceNodes.replaceChildren();
  edges.replaceChildren();
  const projectY = 90 + projects.indexOf(project) * 120;

  project.services.forEach((service, index) => {
    const y = 90 + index * 80;
    const node = document.createElement('div');
    node.className = 'graph-node service-node';
    node.style.top = `${y - 23}px`;
    node.textContent = service;
    serviceNodes.append(node);

    const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    edge.setAttribute('d', `M 470 ${projectY} C 535 ${projectY}, 535 ${y}, 600 ${y}`);
    edges.append(edge);
  });

  graphDetails.textContent = `${project.name} · ${project.version} · ${project.services.length} services. Lines show services included in this project. Sample configuration; launching is not connected yet.`;
}

graph.querySelectorAll('[data-project]').forEach((button) => {
  button.addEventListener('click', () => {
    selectProject(projects.find((project) => project.id === button.dataset.project));
  });
});
selectProject(projects[0]);
