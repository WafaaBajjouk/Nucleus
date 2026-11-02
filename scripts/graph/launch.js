function statusLabel(instance) {
  if (instance.runtimeStatus === 'up') return 'Up';
  if (instance.runtimeStatus === 'down') return 'Not up';
  if (instance.runtimeStatus === 'failed') return 'Failed';
  if (instance.runtimeStatus === 'starting') return 'Starting';
  return 'Unknown';
}

export function initGraphLaunch(state) {
  const launch = state.tooltipLaunch;
  const status = state.tooltipLaunchStatus;
  const list = document.querySelector('#graph-instance-list');
  let busy = false;
  let loading = false;
  let timer;
  state.dockerReady = false;

  function render(instances) {
    state.instances = instances;
    for (const node of state.projectNodes) {
      const related = instances.filter(
        (instance) => instance.projectId === node.dataset.project,
      );
      const upCount = related.filter(
        (instance) => instance.runtimeStatus === 'up',
      ).length;
      const startingCount = related.filter(
        (instance) => instance.runtimeStatus === 'starting',
      ).length;
      const unknownCount = related.filter(
        (instance) => instance.runtimeStatus === 'unknown',
      ).length;
      node.title = related
        .map(
          (instance) =>
            `${instance.image || 'Image building'} · ${statusLabel(instance)} · health: ${instance.health || 'unknown'}${instance.url ? ` · ${instance.url}` : ''}`,
        )
        .join('\n');
      node.classList.toggle('has-running-instance', upCount > 0);
      let indicator = node.querySelector('.node-runtime');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'node-runtime';
        indicator.setAttribute('aria-hidden', 'true');
        node.append(indicator);
      }
      const nodeStatus = upCount
        ? 'up'
        : startingCount
          ? 'starting'
          : unknownCount
            ? 'unknown'
            : related.length
              ? 'down'
              : 'empty';
      indicator.className = `node-runtime ${nodeStatus}`;
      indicator.textContent = upCount
        ? `● ${upCount} up${startingCount ? ` · ${startingCount} starting` : ''}`
        : startingCount
          ? `● ${startingCount} starting`
          : unknownCount
            ? '● Status unknown'
            : related.length
              ? '● Not up'
              : '● Not running';
      node.setAttribute(
        'aria-label',
        `${node.querySelector('strong').textContent}: ${
          upCount
            ? `${upCount} instance${upCount === 1 ? '' : 's'} up`
            : startingCount
              ? `${startingCount} starting`
              : unknownCount
                ? 'status unavailable'
                : related.length
                  ? 'not up'
                  : 'not running'
        }`,
      );
    }

    const projectId = (state.tooltipProject || state.selectedProject)?.id;
    const selected = instances.filter(
      (instance) => instance.projectId === projectId,
    );
    const ready = selected.find(
      (instance) => instance.runtimeStatus === 'up' && instance.url,
    );
    state.tooltipAppLink.href = ready?.url || '';
    state.tooltipAppLink.hidden = !ready;
    if (ready) {
      status.textContent = `${ready.name} is ready.`;
    } else {
      const starting = selected.find(
        (instance) => instance.runtimeStatus === 'starting',
      );
      const failed = selected.find(
        (instance) => instance.runtimeStatus === 'failed',
      );
      if (starting) status.textContent = `${starting.name} is starting.`;
      else if (failed) status.textContent = failed.message;
    }
    list.replaceChildren(
      ...selected.map((instance) => {
        const row = document.createElement('li');
        row.className = 'instance-row';
        const dot = document.createElement('span');
        dot.className = `instance-dot ${instance.runtimeStatus}`;
        dot.setAttribute('aria-hidden', 'true');
        const details = document.createElement('div');
        details.className = 'instance-details';
        const name = document.createElement('strong');
        name.textContent = `${instance.name} · ${statusLabel(instance)}`;
        const meta = document.createElement('span');
        meta.textContent = `${instance.image || 'Image building'} · ${instance.message || ''}`;
        details.append(name, meta);
        row.append(dot, details);
        if (instance.runtimeStatus === 'up' && instance.url) {
          const open = document.createElement('a');
          open.className = 'instance-open';
          open.href = instance.url;
          open.target = '_blank';
          open.rel = 'noopener noreferrer';
          open.textContent = 'Open app ↗';
          row.append(open);
        }
        return row;
      }),
    );
  }

  state.onSelectionChange = () => {
    render(state.instances || []);
  };
  state.onDockerReadinessChange = (readiness) => {
    state.dockerReady = readiness.ready;
    launch.disabled =
      busy || !state.tooltipProject?.composeFile || !readiness.ready;
    if (busy || !state.tooltipProject?.composeFile) return;
    status.textContent = readiness.ready
      ? `Launch ${state.tooltipProject.name}.`
      : readiness.message;
  };
  state.onTooltipProjectChange = (project) => {
    state.tooltipProject = project;
    launch.disabled = busy || !project?.composeFile || !state.dockerReady;
    status.textContent = project
      ? project.composeFile
        ? state.dockerReady
          ? `Launch ${project.name}.`
          : 'Docker is not ready. See the setup status below.'
        : 'This project cannot be launched.'
      : 'Hover over or focus a project to see its launch action.';
    render(state.instances || []);
  };
  state.onInstancesUpdate = render;

  async function refresh() {
    if (loading) return;
    loading = true;
    clearTimeout(timer);
    try {
      const response = await fetch('/api/instances', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not load instance status.');
      render(result);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      loading = false;
      timer = setTimeout(refresh, 2500);
    }
  }

  launch.addEventListener('click', async () => {
    const project = state.tooltipProject;
    if (busy || !project?.composeFile || !state.dockerReady) return;
    busy = true;
    launch.disabled = true;
    launch.textContent = 'Starting…';
    status.textContent = `Building and starting ${project.name}…`;
    try {
      const response = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not start project.');
      status.textContent = `${project.name} is building. Status will update here.`;
      await refresh();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = false;
      launch.textContent = 'Launch project';
      launch.disabled =
        !state.tooltipProject?.composeFile || !state.dockerReady;
    }
  });

  window.addEventListener('pagehide', () => clearTimeout(timer));
  state.onTooltipProjectChange(state.tooltipProject);
  refresh();
}
