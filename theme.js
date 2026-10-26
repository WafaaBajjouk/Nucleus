// Applied before styles load, so saved preferences do not flash the wrong theme.
(() => {
  const key = 'nucleus-theme';
  let theme = 'dark';
  try {
    if (localStorage.getItem(key) === 'light') theme = 'light';
  } catch {
    /* Storage can be blocked in private browsing. */
  }

  function apply(next, save = false) {
    theme = next === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0d111a' : '#f2f5fa';
    document
      .querySelectorAll('[data-theme-toggle]')
      .forEach((button) =>
        button.setAttribute('aria-checked', String(theme === 'dark')),
      );
    if (save) {
      try {
        localStorage.setItem(key, theme);
      } catch {
        /* The switch still works without persistence. */
      }
    }
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    apply(theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () =>
        apply(theme === 'dark' ? 'light' : 'dark', true),
      );
    });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === key) apply(event.newValue);
  });
})();
