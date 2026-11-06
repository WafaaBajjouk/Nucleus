function createStatusDot(status) {
  const dot = document.createElement('span');
  dot.className = `instance-dot ${status}`;
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

function createSegment(status, count, total, label) {
  if (!count) return null;
  const segment = document.createElement('span');
  segment.className = `chart-segment ${status}`;
  segment.style.flexBasis = `${(count / total) * 100}%`;
  segment.title = `${count} ${label}`;
  return segment;
}

export function initInstanceOverview() {
  const list = document.querySelector('#instance-list');
  const status = document.querySelector('#instance-status');
  const chart = document.querySelector('#instance-chart');
  let loading = false;
  let timer;

  function render(instances) {
    const counts = {
      up: instances.filter((instance) => instance.runtimeStatus === 'up')
        .length,
      down: instances.filter((instance) =>
        ['down', 'failed'].includes(instance.runtimeStatus),
      ).length,
      starting: instances.filter(
        (instance) => instance.runtimeStatus === 'starting',
      ).length,
      unknown: instances.filter(
        (instance) => instance.runtimeStatus === 'unknown',
      ).length,
    };
    const total = instances.length;
    document.querySelector('#instances-up').textContent = counts.up;
    document.querySelector('#instances-down').textContent = counts.down;
    document.querySelector('#instances-unknown').textContent = counts.unknown;
    document.querySelector('#instances-starting').textContent = counts.starting;
    document.querySelector('#instances-total').textContent = total;

    chart.replaceChildren(
      ...[
        createSegment('up', counts.up, total, 'up'),
        createSegment('down', counts.down, total, 'not up'),
        createSegment('unknown', counts.unknown, total, 'unknown'),
        createSegment('starting', counts.starting, total, 'starting'),
      ].filter(Boolean),
    );
    chart.setAttribute(
      'aria-label',
      `${counts.up} up, ${counts.down} not up, ${counts.starting} starting, ${counts.unknown} unknown, ${total} total`,
    );

    if (!total) {
      list.replaceChildren();
      status.textContent = 'No instances have been recorded yet.';
      return;
    }

    list.replaceChildren(
      ...instances.map((instance) => {
        const row = document.createElement('li');
        row.className = 'instance-row';
        const label =
          instance.runtimeStatus === 'up'
            ? 'Up'
            : instance.runtimeStatus === 'down'
              ? 'Not up'
              : instance.runtimeStatus === 'failed'
                ? 'Failed'
                : instance.runtimeStatus === 'starting'
                  ? 'Starting'
                  : 'Unknown';
        row.append(createStatusDot(instance.runtimeStatus));
        const details = document.createElement('div');
        details.className = 'instance-details';
        const name = document.createElement('strong');
        name.textContent = instance.name;
        const meta = document.createElement('span');
        const date = instance.createdAt
          ? new Date(instance.createdAt).toLocaleString()
          : 'Launch time unavailable';
        meta.textContent = `${instance.image || 'Container image'} · ${date}`;
        details.append(name, meta);
        if (instance.runtimeStatus === 'up') {
          const metrics = document.createElement('div');
          metrics.className = 'instance-resource-metrics';
          const cpu = document.createElement('span');
          cpu.textContent =
            instance.metrics?.cpuPercent == null
              ? 'CPU unavailable'
              : `CPU ${instance.metrics.cpuPercent.toFixed(1)}%`;
          const memory = document.createElement('span');
          memory.textContent = instance.metrics?.memoryUsage
            ? `Memory ${instance.metrics.memoryUsage}`
            : 'Memory unavailable';
          metrics.append(cpu, memory);
          details.append(metrics);
          if (instance.metricsMessage) {
            const note = document.createElement('small');
            note.className = 'instance-message';
            note.textContent = instance.metricsMessage;
            details.append(note);
          }
        }
        if (instance.message) {
          const message = document.createElement('small');
          message.className = 'instance-message';
          message.textContent = instance.message;
          details.append(message);
        }
        row.append(details);
        const badge = document.createElement('span');
        badge.className = `instance-badge ${instance.runtimeStatus}`;
        badge.append(createStatusDot(instance.runtimeStatus));
        badge.append(document.createTextNode(label));
        if (instance.runtimeStatus === 'up' && instance.health !== 'unknown') {
          const health = document.createElement('small');
          health.className = `instance-health ${instance.health}`;
          health.textContent = instance.health;
          badge.append(health);
        }
        row.append(badge);
        if (instance.runtimeStatus === 'up' && instance.url) {
          const open = document.createElement('a');
          open.className = 'instance-open';
          open.href = instance.url;
          open.target = '_blank';
          open.rel = 'noopener noreferrer';
          open.textContent = 'Open app ↗';
          row.append(open);
        }
        const remove = document.createElement('button');
        remove.className = 'instance-remove';
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.addEventListener('click', async () => {
          if (
            !window.confirm(
              `Remove ${instance.name} and permanently delete its container and data?`,
            )
          )
            return;
          remove.disabled = true;
          try {
            const response = await fetch(`/api/instances/${instance.id}`, {
              method: 'DELETE',
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(result.error || 'Could not remove instance.');
            status.textContent = `${instance.name} and its data were removed.`;
            await refresh();
          } catch (error) {
            status.textContent = error.message;
            remove.disabled = false;
          }
        });
        row.append(remove);
        return row;
      }),
    );
    status.textContent = `${total} instance${total === 1 ? '' : 's'} · state checked with Docker`;
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    clearTimeout(timer);
    list.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/instances', {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not load instance status.');
      render(result);
    } catch (error) {
      status.textContent = `${error.message} Instance status will retry automatically.`;
    } finally {
      list.setAttribute('aria-busy', 'false');
      loading = false;
      timer = setTimeout(refresh, 3000);
    }
  }

  window.addEventListener('pagehide', () => clearTimeout(timer));
  return refresh();
}
