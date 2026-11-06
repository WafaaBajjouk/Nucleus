const form = document.querySelector('#tool');
const status = document.querySelector('#status');
const output = document.querySelector('#result');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Processing…';
  output.textContent = '';
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: document.querySelector('#text').value }),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    output.textContent = data.formatted;
    status.textContent = 'Done.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
