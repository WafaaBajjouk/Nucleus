import { loadExampleProjects } from '../../data/projects.js';

export function initProjectCatalogue() {
  const grid = document.querySelector('#project-list');
  const status = document.querySelector('#project-status');
  const search = document.querySelector('#project-search');
  const refresh = document.querySelector('#refresh-projects');
  let projects = [];

  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = projects.filter((project) =>
      `${project.name} ${project.description}`.toLowerCase().includes(query),
    );
    grid.replaceChildren(
      ...visible.map((project) => {
        const card = document.createElement('article');
        card.className = 'project-card';
        const icon = document.createElement('span');
        icon.className = 'project-icon';
        icon.textContent = project.name.slice(0, 1).toUpperCase();
        const name = document.createElement('h3');
        name.textContent = project.name;
        const description = document.createElement('p');
        description.textContent = project.description;
        const directory = document.createElement('small');
        directory.className = 'project-directory';
        directory.textContent = project.directory;
        const footer = document.createElement('div');
        footer.className = 'project-footer';
        const version = document.createElement('code');
        version.textContent = project.version;
        const compose = document.createElement('span');
        compose.textContent = project.composeFile
          ? 'Compose file found'
          : 'No Compose file';
        const link = document.createElement('a');
        link.className = 'project-link';
        link.href = `graph.html?project=${encodeURIComponent(project.id)}`;
        link.textContent = 'View in graph →';
        footer.append(version, compose);
        card.append(icon, name, description, directory, footer, link);
        return card;
      }),
    );
    status.textContent = visible.length
      ? `${visible.length} project${visible.length === 1 ? '' : 's'}`
      : projects.length
        ? 'No projects match your search.'
        : 'No projects found. Add a project folder to examples/ and refresh.';
  }

  async function refreshProjects() {
    refresh.disabled = true;
    search.disabled = true;
    grid.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading example projects…';
    try {
      projects = await loadExampleProjects();
      document.querySelector('#project-total').textContent = projects.length;
      document.querySelector('#compose-total').textContent = projects.filter(
        (project) => project.composeFile,
      ).length;
      render();
    } catch (error) {
      status.textContent = `${error.message} Select Refresh to retry.`;
    } finally {
      refresh.disabled = false;
      search.disabled = false;
      grid.setAttribute('aria-busy', 'false');
    }
  }
  search.addEventListener('input', render);
  refresh.addEventListener('click', refreshProjects);
  return refreshProjects();
}
