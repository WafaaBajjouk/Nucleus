import { arrangeProjects, centerGraph, drawEdges } from './layout.js';
import { defaultGithubUsername } from '../../data/config.js';
import { loadExampleProjects } from '../../data/projects.js';

export function initGraphImport(state, selection) {
  const form = document.querySelector('#github-import');
  const input = document.querySelector('#github-username');
  const submit = form.querySelector('button');
  const localButton = document.querySelector('#local-projects');
  const status = document.querySelector('#graph-status');
  const requestedProject = new URLSearchParams(window.location.search).get(
    'project',
  );

  function showProjects(projects, owner, local) {
    state.projects = projects;
    state.projectNodes.forEach((node) => node.remove());
    state.projectNodes.splice(0);
    state.workspace.querySelector('strong').textContent = owner;
    state.workspace.querySelector('small').textContent = local
      ? 'Demo workspace'
      : 'GitHub projects';
    projects.forEach((project) => {
      const node = document.createElement('button');
      node.className = 'graph-node project-node';
      node.dataset.project = project.id;
      node.setAttribute('aria-pressed', 'false');
      const title = document.createElement('strong');
      title.textContent = project.name;
      const subtitle = document.createElement('small');
      subtitle.textContent = local
        ? `${project.version} · Demo workspace`
        : `${project.private ? 'Private' : 'Public'} · ${project.language || 'Repository'}`;
      node.append(title, subtitle);
      state.graph.append(node);
      state.projectNodes.push(node);
    });
    status.textContent = `${projects.length} ${local ? 'demo projects' : 'GitHub projects'} · ${owner}`;
    arrangeProjects(state);
    drawEdges(state);
    selection.selectProject(
      projects.find((project) => project.id === requestedProject) ||
        projects[0],
    );
    centerGraph(state);
  }

  // One loading/error path for both sources; startup always chooses examples.
  async function loadProjects(local) {
    submit.disabled = true;
    localButton.disabled = true;
    status.textContent = local
      ? 'Loading demo workspace…'
      : 'Loading GitHub projects…';
    try {
      if (local) {
        showProjects(await loadExampleProjects(), 'Nucleus', true);
      } else {
        const username = input.value.trim();
        if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username))
          throw Error('Enter a valid GitHub username.');
        const response = await fetch(
          `/api/github/repos?username=${encodeURIComponent(username)}`,
          { signal: AbortSignal.timeout(120000) },
        );
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error || 'Could not load repositories.');
        if (result.mode === 'demo') {
          showProjects(await loadExampleProjects(), 'Nucleus', true);
          status.textContent +=
            ' · No GitHub token configured; using Demo workspace';
        } else {
          showProjects(result, username, false);
        }
      }
    } catch (error) {
      status.textContent = `${error.message} ${state.projects.length ? 'Your current graph is unchanged.' : 'Select Demo workspace to retry.'}`;
    } finally {
      submit.disabled = false;
      localButton.disabled = false;
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadProjects(false);
  });
  localButton.addEventListener('click', () => loadProjects(true));
  input.value = defaultGithubUsername;
  return loadProjects(true);
}
