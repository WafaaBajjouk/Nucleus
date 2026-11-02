import { initSidebarNavigation } from './sidebar-navigation.js';

const form = document.querySelector('#repository-form');
const url = document.querySelector('#repository-url');
const status = document.querySelector('#repository-status');
const graphLink = document.querySelector('#repository-graph-link');
const submit = form.querySelector('button[type="submit"]');

initSidebarNavigation();
document.querySelector('[data-page-title]').textContent = 'Add project';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submit.disabled = true;
  graphLink.hidden = true;
  status.textContent = 'Cloning public repository…';
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.value }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || 'Could not add repository.');
    url.value = '';
    graphLink.href = `graph.html?project=${encodeURIComponent(result.id)}`;
    graphLink.hidden = false;
    status.textContent = `${result.name} added from GitHub.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
