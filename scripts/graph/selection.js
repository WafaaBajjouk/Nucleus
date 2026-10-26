export function initGraphSelection(state) {
  function selectProject(project) {
    state.selectedProject = project || null;
    state.projectNodes.forEach((node) =>
      node.setAttribute(
        'aria-pressed',
        String(node.dataset.project === project?.id),
      ),
    );
    if (!project) {
      state.details.textContent = 'No projects available.';
      return;
    }
    if (project.source === 'example') {
      state.details.textContent = `${project.name} · ${project.version} · ${project.directory}. ${project.description} ${project.composeFile ? `Compose: ${project.composeFile}.` : 'No Compose file found.'} Launching from the graph is not connected yet.`;
    } else {
      state.details.textContent = `${project.name} · ${project.private ? 'Private' : 'Public'} · ${project.language || 'Language not specified'} · Branch: ${project.version || 'Not specified'}. ${project.description || 'No description.'} `;
      const link = document.createElement('a');
      link.href = project.url;
      link.textContent = 'Open on GitHub ↗';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      state.details.append(link);
    }
  }
  return { selectProject };
}
