export function initSidebarNavigation() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const target = path.endsWith('/add-project.html')
    ? 'add-project.html'
    : hash === '#projects'
      ? '#projects'
      : './';
  const current = [...document.querySelectorAll('.sidebar .nav-item')].find(
    (link) => link.getAttribute('href') === target,
  );
  current?.classList.add('active');
  current?.setAttribute('aria-current', 'page');
}
