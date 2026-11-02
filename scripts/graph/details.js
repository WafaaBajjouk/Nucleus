export function initNodeDetails(state) {
  const tooltip = document.createElement('div');
  tooltip.id = 'node-details';
  tooltip.className = 'node-details';
  tooltip.setAttribute('role', 'group');
  tooltip.setAttribute('aria-label', 'Project details and launch');
  tooltip.hidden = true;
  document.body.append(tooltip);
  state.tooltip = tooltip;
  const launch = document.createElement('button');
  launch.className = 'button primary';
  launch.type = 'button';
  launch.textContent = 'Launch project';
  launch.disabled = true;
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  const appLink = document.createElement('a');
  appLink.className = 'instance-open';
  appLink.target = '_blank';
  appLink.rel = 'noopener noreferrer';
  appLink.textContent = 'Open app ↗';
  appLink.hidden = true;
  const actions = document.createElement('div');
  actions.className = 'node-details-actions';
  actions.append(launch, status, appLink);
  state.tooltipLaunch = launch;
  state.tooltipLaunchStatus = status;
  state.tooltipAppLink = appLink;
  state.tooltipProject = null;
  let activeNode = null;
  let hideTimer;

  function hide() {
    clearTimeout(hideTimer);
    activeNode?.removeAttribute('aria-describedby');
    activeNode?.setAttribute('aria-expanded', 'false');
    activeNode = null;
    tooltip.hidden = true;
    state.tooltipProject = null;
    state.onTooltipProjectChange?.(null);
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (
        document.activeElement !== activeNode &&
        !tooltip.contains(document.activeElement)
      )
        hide();
    }, 180);
  }

  function show(node) {
    if (!node || node.classList.contains('dragging')) return;
    clearTimeout(hideTimer);
    hide();
    const project = state.projects.find(
      (item) => item.id === node.dataset.project,
    );
    const heading = document.createElement('strong');
    const metadata = document.createElement('small');
    const description = document.createElement('p');
    if (project) {
      heading.textContent = project.name;
      metadata.textContent = `Version ${project.version} · Demo workspace`;
      description.textContent =
        project.description || 'No description provided.';
      state.tooltipProject = project;
      state.onTooltipProjectChange?.(project);
      tooltip.replaceChildren(heading, metadata, description, actions);
    } else if (node === state.workspace) {
      heading.textContent = node.querySelector('strong').textContent;
      metadata.textContent = `${state.projects.length} projects`;
      description.textContent =
        'Select a project to explore its details. Drag nodes to arrange your workspace.';
      state.tooltipProject = null;
      state.onTooltipProjectChange?.(null);
      tooltip.replaceChildren(heading, metadata, description);
    } else {
      heading.textContent = node.textContent;
      metadata.textContent = 'Project service';
      description.textContent = state.selectedProject?.name || '';
      state.tooltipProject = null;
      state.onTooltipProjectChange?.(null);
      tooltip.replaceChildren(heading, metadata, description);
    }
    activeNode = node;
    node.setAttribute('aria-describedby', tooltip.id);
    node.setAttribute('aria-expanded', 'true');
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
  state.graph.addEventListener('focusout', (event) => {
    if (!tooltip.contains(event.relatedTarget)) hide();
  });
  tooltip.addEventListener('focusout', (event) => {
    if (
      !tooltip.contains(event.relatedTarget) &&
      !activeNode?.contains(event.relatedTarget)
    )
      hide();
  });
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
    scheduleHide();
  });
  tooltip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  tooltip.addEventListener('pointerleave', scheduleHide);
  state.graph.addEventListener('pointermove', (event) => {
    if (event.buttons) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
  state.graph.parentElement.addEventListener('scroll', hide);
  window.addEventListener('scroll', hide);
  window.addEventListener('resize', hide);
  new MutationObserver(() => {
    if (activeNode && !activeNode.isConnected) hide();
  }).observe(state.graph, { childList: true, subtree: true });
}
