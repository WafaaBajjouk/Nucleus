import { arrangeProjects, centerGraph, drawEdges } from './layout.js';
import { loadExampleProjects } from '../../data/projects.js';

export function initGraphImport(state, selection) {
  const localButton = document.querySelector('#local-projects');
  const status = document.querySelector('#graph-status');
  const requestedProject = new URLSearchParams(window.location.search).get(
    'project',
  );

  function showProjects(projects) {
    state.projects = projects;
    state.projectNodes.forEach((node) => node.remove());
    state.projectNodes.splice(0);
    state.workspace.querySelector('strong').textContent = 'Nucleus';
    state.workspace.querySelector('small').textContent = 'Demo workspace';
    projects.forEach((project) => {
      const node = document.createElement('button');
      node.className = 'graph-node project-node';
      node.dataset.project = project.id;
      node.setAttribute('aria-pressed', 'false');
      const title = document.createElement('strong');
      title.textContent = project.name;
      const subtitle = document.createElement('small');
      subtitle.textContent = `${project.version} · Demo workspace`;
      node.append(title, subtitle);
      state.graph.append(node);
      state.projectNodes.push(node);
    });
    status.textContent = `${projects.length} demo projects · Nucleus`;
    arrangeProjects(state);
    drawEdges(state);
    selection.selectProject(
      projects.find((project) => project.id === requestedProject) ||
        projects[0],
    );
    centerGraph(state);
  }

  async function loadProjects() {
    localButton.disabled = true;
    status.textContent = 'Loading demo workspace…';
    try {
      showProjects(await loadExampleProjects());
    } catch (error) {
      status.textContent = `${error.message} ${state.projects.length ? 'Your current graph is unchanged.' : 'Select Demo workspace to retry.'}`;
    } finally {
      localButton.disabled = false;
    }
  }
  localButton.addEventListener('click', loadProjects);
  return loadProjects();
}
