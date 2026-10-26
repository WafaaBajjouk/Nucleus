import { arrangeProjects, centerGraph } from './layout.js';
import { defaultGithubUsername } from '../../data/config.js';
import { loadDemoProjects } from '../../data/projects.js';

export function initGraphImport(state, selection) {
  const form = document.querySelector('#github-import');
  const input = document.querySelector('#github-username');
  const submit = form.querySelector('button');
  const demoButton = document.querySelector('#demo-projects');
  const status = document.querySelector('#graph-status');

  function showProjects(projects, owner, demo = false) {
    state.graph.querySelector('.service-nodes').replaceChildren();
    selection.clearPositions();
    state.selectedProject = null;
    state.projects = projects;
    state.projectNodes.forEach((node) => node.remove());
    state.projectNodes.splice(0);
    state.workspace.querySelector('strong').textContent = owner;
    state.workspace.querySelector('small').textContent = demo
      ? 'Development team'
      : 'GitHub repositories';
    projects.forEach((project) => {
      const node = document.createElement('button');
      node.className = 'graph-node project-node';
      node.dataset.project = project.id;
      node.title = project.name;
      node.setAttribute('aria-pressed', 'false');
      const title = document.createElement('strong');
      title.textContent = project.name;
      const subtitle = document.createElement('small');
      subtitle.textContent = demo
        ? `${project.version} · Local example`
        : `${project.private ? 'Private' : 'Public'} · ${project.language || 'Repository'}`;
      node.append(title, subtitle);
      state.graph.append(node);
      state.projectNodes.push(node);
    });
    status.textContent = `${projects.length} ${demo ? 'demo projects' : 'repositories'}${demo ? '' : ` · ${owner}`}`;
    arrangeProjects(state);
    selection.selectProject(projects[0]);
    centerGraph(state);
  }

  async function loadRepositories() {
    const username = input.value.trim();
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
      status.textContent = 'Enter a valid GitHub username.';
      return;
    }
    submit.disabled = true;
    demoButton.disabled = true;
    status.textContent = 'Loading repositories…';
    try {
      const response = await fetch(
        `/api/github/repos?username=${encodeURIComponent(username)}`,
        { signal: AbortSignal.timeout(120000) },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not load repositories.');
      if (result.mode === 'demo') {
        const demoProjects = await loadDemoProjects();
        showProjects(demoProjects, 'Nucleus', true);
        status.textContent = `${demoProjects.length} demo projects · No GitHub token configured`;
        return;
      }
      showProjects(result, username);
    } catch (error) {
      status.textContent = `${error.message} ${state.projects.length ? 'Your current graph is unchanged.' : 'Check the username and select Load repositories to retry.'}`;
    } finally {
      submit.disabled = false;
      demoButton.disabled = false;
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadRepositories();
  });
  demoButton.addEventListener('click', async () => {
    demoButton.disabled = true;
    submit.disabled = true;
    status.textContent = 'Loading example projects…';
    try {
      showProjects(await loadDemoProjects(), 'Nucleus', true);
    } catch (error) {
      status.textContent = `${error.message} Your current graph is unchanged.`;
    } finally {
      demoButton.disabled = false;
      submit.disabled = false;
    }
  });
  input.value = defaultGithubUsername;
  state.workspace.querySelector('strong').textContent = defaultGithubUsername;
  state.workspace.querySelector('small').textContent = 'GitHub repositories';
  state.details.textContent = 'Loading repositories from GitHub…';
  loadRepositories();
}
