import { instances } from '../data/instances.js';
import { renderInstances } from '../scripts/instances/render.js';
import { initInstanceControls } from '../scripts/instances/controls.js';

export function initInstances() {
  const search = document.querySelector('#instance-search');
  initInstanceControls(search, (status, query) =>
    renderInstances(instances, status, query),
  );
  renderInstances(instances, 'all', '');
}
