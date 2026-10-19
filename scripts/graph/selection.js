import { position, drawEdges } from './layout.js';
export function initGraphSelection(state) {
  const { graph, details, projectNodes } = state;
  const savedServices = new Map();
  function rememberServices() {
    savedServices.set(
      state.selectedProject.id,
      [...graph.querySelectorAll('.service-node')].map((node) => ({
        x: node.offsetLeft,
        y: node.offsetTop,
      })),
    );
  }

  function selectProject(project) {
    rememberServices();
    state.selectedProject = project;
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
      position(graph, node, saved?.x ?? 600, saved?.y ?? 67 + index * 80);
    });
    details.textContent = `${project.name} · ${project.version} · ${project.services.length} services. Sample configuration; launching is not connected yet.`;
    drawEdges(state);
  }

  return {
    selectProject,
    rememberServices,
    clearPositions: () => savedServices.clear(),
  };
}
