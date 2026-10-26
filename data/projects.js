export async function loadDemoProjects() {
  const response = await fetch('/api/examples');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load examples.');
  return result;
}
