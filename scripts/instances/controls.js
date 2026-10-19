export function initInstanceControls(search, onChange) {
  let statusFilter = 'all';
  const renderInstances = () =>
    onChange(statusFilter, search.value.trim().toLowerCase());
  search.addEventListener('input', renderInstances);
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      statusFilter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      renderInstances();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (
      event.key === '/' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.target.closest('input, textarea, [contenteditable]')
    ) {
      event.preventDefault();
      search.focus();
    }
  });
}
