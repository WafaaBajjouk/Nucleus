export function initDockerReadiness(onStatus = () => {}) {
  const status = document.querySelector('#docker-status');
  const check = document.querySelector('#docker-check');
  let loading = false;
  let timer;

  async function refresh() {
    if (loading) return;
    loading = true;
    clearTimeout(timer);
    check.disabled = true;
    status.textContent = 'Checking Docker and Compose…';
    try {
      const response = await fetch('/api/engine', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not check Docker readiness.');
      status.textContent = result.message;
      onStatus(result);
    } catch (error) {
      status.textContent = `${error.message} Check that Nucleus is running, then retry.`;
      onStatus({ ready: false, message: error.message });
    } finally {
      loading = false;
      check.disabled = false;
      timer = setTimeout(refresh, 15000);
    }
  }

  check.addEventListener('click', refresh);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  refresh();
}
