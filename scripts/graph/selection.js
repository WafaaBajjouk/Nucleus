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
    state.details.textContent = `${project.name} · ${project.version} · Demo workspace. ${project.description} ${project.composeFile ? `Compose: ${project.composeFile}.` : 'No Compose file found.'} Launching from the graph is not connected yet.`;
  }
  return { selectProject };
}
