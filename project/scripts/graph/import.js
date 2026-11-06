import { arrangeProjects, centerGraph, drawEdges } from './layout.js';
import { loadProjects } from '../../data/projects.js';

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
    state.workspace.querySelector('small').textContent = 'Project catalogue';
    projects.forEach((project) => {
      const node = document.createElement('button');
      node.className = 'graph-node project-node';
      node.dataset.project = project.id;
      node.setAttribute('aria-pressed', 'false');
      const title = document.createElement('strong');
      title.textContent = project.name;
      const subtitle = document.createElement('small');
      subtitle.textContent =
        project.source === 'github'
          ? `GitHub · ${project.owner}/${project.name}`
          : `${project.version} · Bundled demo`;
      node.append(title, subtitle);
      state.graph.append(node);
      state.projectNodes.push(node);
    });
    const demos = projects.filter((project) => project.source === 'example');
    const repositories = projects.filter(
      (project) => project.source === 'github',
    );
    status.textContent = `${demos.length} demos · ${repositories.length} GitHub repos · Nucleus`;
    arrangeProjects(state);
    drawEdges(state);
    selection.selectProject(
      projects.find((project) => project.id === requestedProject) ||
        projects[0],
    );
    centerGraph(state);
  }

  async function refreshProjects() {
    localButton.disabled = true;
    status.textContent = 'Loading projects…';
    try {
      showProjects(await loadProjects());
    } catch (error) {
      status.textContent = `${error.message} ${state.projects.length ? 'Your current graph is unchanged.' : 'Select Refresh projects to retry.'}`;
    } finally {
      localButton.disabled = false;
    }
  }
  localButton.addEventListener('click', refreshProjects);
  return refreshProjects();
}
