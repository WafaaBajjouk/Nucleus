const form = document.querySelector('#converter');
const output = document.querySelector('#result');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  output.textContent = 'Converting…';
  try {
    const query = new URLSearchParams(new FormData(form));
    const response = await fetch(`/api/convert?${query}`);
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    output.textContent = `${data.value} ${data.from} = ${data.result.toLocaleString(undefined, { maximumSignificantDigits: 10 })} ${data.to}`;
  } catch (error) {
    output.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
