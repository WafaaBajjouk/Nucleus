export function initNodeDetails(state) {
  const tooltip = document.createElement('div');
  tooltip.id = 'node-details';
  tooltip.className = 'node-details';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  let activeNode = null;

  function hide() {
    activeNode?.removeAttribute('aria-describedby');
    activeNode = null;
    tooltip.hidden = true;
  }

  function show(node) {
    if (!node || node.classList.contains('dragging')) return;
    hide();
    const project = state.projects.find(
      (item) => item.id === node.dataset.project,
    );
    const heading = document.createElement('strong');
    const metadata = document.createElement('small');
    const description = document.createElement('p');
    if (project) {
      heading.textContent = project.name;
      metadata.textContent =
        project.source === 'example'
          ? `Version ${project.version} · Demo workspace`
          : `${project.private ? 'Private' : 'Public'} · ${project.language || 'Language not specified'} · Branch: ${project.version || 'Not specified'}`;
      description.textContent =
        project.description || 'No description provided.';
    } else if (node === state.workspace) {
      heading.textContent = node.querySelector('strong').textContent;
      metadata.textContent = `${state.projects.length} projects`;
      description.textContent =
        'Select a project to explore its details. Drag nodes to arrange your workspace.';
    } else {
      heading.textContent = node.textContent;
      metadata.textContent = 'Project service';
      description.textContent = state.selectedProject?.name || '';
    }
    tooltip.replaceChildren(heading, metadata, description);
    activeNode = node;
    node.setAttribute('aria-describedby', tooltip.id);
    tooltip.hidden = false;
    const rect = node.getBoundingClientRect();
    const margin = 12;
    const left = Math.max(
      margin,
      Math.min(
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2,
        window.innerWidth - tooltip.offsetWidth - margin,
      ),
    );
    const top =
      rect.bottom + tooltip.offsetHeight + margin * 2 <= window.innerHeight
        ? rect.bottom + margin
        : Math.max(margin, rect.top - tooltip.offsetHeight - margin);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  state.graph.addEventListener('focusin', (event) =>
    show(event.target.closest('.graph-node')),
  );
  state.graph.addEventListener('focusout', hide);
  state.graph.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const node = event.target.closest('.graph-node');
    if (node && !node.contains(event.relatedTarget)) show(node);
  });
  state.graph.addEventListener('pointerout', (event) => {
    if (
      !activeNode ||
      activeNode.contains(event.relatedTarget) ||
      tooltip.contains(event.relatedTarget)
    )
      return;
    if (document.activeElement !== activeNode) hide();
  });
  tooltip.addEventListener('pointerleave', () => {
    if (document.activeElement !== activeNode) hide();
  });
  state.graph.addEventListener('pointermove', (event) => {
    if (event.buttons) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
  state.graph.parentElement.addEventListener('scroll', hide);
  window.addEventListener('scroll', hide);
  window.addEventListener('resize', hide);
  // Imports replace nodes; never leave details for a removed project visible.
  new MutationObserver(() => {
    if (activeNode && !activeNode.isConnected) hide();
  }).observe(state.graph, { childList: true, subtree: true });
}
