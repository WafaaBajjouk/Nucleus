const form = document.querySelector('#task-form');
const input = document.querySelector('#title');
const status = document.querySelector('#status');
const list = document.querySelector('#tasks');
let busy = false;
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request failed');
  return data;
}
async function render() {
  const tasks = await api('/api/tasks');
  list.replaceChildren();
  document.querySelector('#count').textContent =
    `${tasks.filter((task) => task.completed).length} / ${tasks.length} done`;
  status.textContent = tasks.length
    ? ''
    : 'No tasks yet. Add your first one above.';
  for (const task of tasks) {
    const row = document.createElement('li');
    row.classList.toggle('completed', task.completed);
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () =>
      mutate(async () => {
        try {
          await api(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ completed: checkbox.checked }),
          });
        } catch (error) {
          checkbox.checked = !checkbox.checked;
          throw error;
        }
      }),
    );
    const title = document.createElement('span');
    title.textContent = task.title;
    label.append(checkbox, title);
    const remove = document.createElement('button');
    remove.className = 'delete';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${task.title}`);
    remove.addEventListener('click', () =>
      mutate(() => api(`/api/tasks/${task.id}`, { method: 'DELETE' })),
    );
    row.append(label, remove);
    list.append(row);
  }
}
async function mutate(action) {
  if (busy) return;
  busy = true;
  document
    .querySelectorAll('button, input')
    .forEach((element) => (element.disabled = true));
  try {
    await action();
    await render();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
    document
      .querySelectorAll('button, input')
      .forEach((element) => (element.disabled = false));
  }
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  mutate(async () => {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    input.value = '';
  });
});
render().catch((error) => (status.textContent = error.message));
