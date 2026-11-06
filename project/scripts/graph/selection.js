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
    const source =
      project.source === 'github'
        ? `Public GitHub repository ${project.owner}/${project.name}`
        : 'Bundled demo project';
    const deployment = !project.composeFile
      ? 'No Compose file found.'
      : project.launchable === false
        ? 'Compose found; launch is unavailable.'
        : `Compose: ${project.composeFile}.`;
    state.details.textContent = `${project.name} · ${project.version} · ${source}. ${project.description} ${deployment}`;
  }
  return { selectProject };
}
