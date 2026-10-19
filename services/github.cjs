// Public repository metadata only. No token or account login is required.
async function listRepositories(username, fetchApi = fetch) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    const error = new Error('Enter a valid GitHub username.');
    error.status = 400;
    throw error;
  }
  const repositories = [];
  for (let page = 1; ; page++) {
    const response = await fetchApi(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=full_name&per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Nucleus',
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      const error = new Error(
        response.status === 404
          ? 'GitHub account not found.'
          : response.status === 403 || response.status === 429
            ? 'GitHub rate limit or access restriction. Try again later.'
            : 'GitHub is unavailable. Try again later.',
      );
      error.status =
        response.status === 404
          ? 404
          : response.status === 403 || response.status === 429
            ? 429
            : 502;
      throw error;
    }
    const batch = await response.json();
    for (const repo of batch) {
      repositories.push({
        id: String(repo.id),
        name: repo.name,
        description: repo.description,
        language: repo.language,
        url: `https://github.com/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`,
        version: repo.default_branch,
        services: [],
        source: 'github',
        archived: repo.archived,
      });
    }
    if (batch.length < 100) return repositories;
  }
}
module.exports = { listRepositories };
