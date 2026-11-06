export async function loadProjects() {
  const response = await fetch('/api/projects');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load examples.');
  return result;
}
