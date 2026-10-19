export function renderInstances(instances, statusFilter, query) {
  const rows = document.querySelector('#instance-rows');
  const visible = instances.filter(
    (instance) =>
      (statusFilter === 'all' || instance.status === statusFilter) &&
      `${instance.name} ${instance.project}`.toLowerCase().includes(query),
  );
  rows.replaceChildren(
    ...visible.map((instance) => {
      const row = document.createElement('tr');
      // All markup values below come from the fixed fixtures above, never user input.
      row.innerHTML = `<td><div class="instance-name"><span class="project-icon ${instance.color}">${instance.icon}</span><div><strong>${instance.name}</strong><small>${instance.project}</small></div></div></td>
      <td><span class="badge ${instance.status}"><span class="status-dot"></span>${instance.status === 'running' ? 'Running' : 'Stopped'}</span></td>
      <td><code>${instance.version}</code></td><td class="metric">${instance.cpu}</td><td class="metric">${instance.memory}</td>
      <td><span class="verification ${instance.verification === 'Passed' ? 'passed' : ''}">${instance.verification === 'Passed' ? '✓ ' : '− '}${instance.verification}</span></td>`;
      return row;
    }),
  );
  document.querySelector('#empty-state').hidden = visible.length !== 0;
  document.querySelector('#result-count').textContent =
    `Showing ${visible.length} instance${visible.length === 1 ? '' : 's'}`;
}
