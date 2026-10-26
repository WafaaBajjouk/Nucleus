// Fetch only explicitly configured repositories. Never enumerate an account.
const { readFileSync } = require('node:fs');
const path = require('node:path');

function configuredRepositories() {
  try {
    const names = JSON.parse(
      readFileSync(path.join(__dirname, '../config/repositories.json'), 'utf8'),
    );
    if (!Array.isArray(names) || names.some((name) => typeof name !== 'string'))
      throw new Error('Invalid repository list');
    return names.join(',');
  } catch {
    const error = new Error(
      'Create config/repositories.json as a JSON array of allowed owner/repository names.',
    );
    error.status = 503;
    throw error;
  }
}

async function listRepositories(
  username,
  fetchApi = fetch,
  token = process.env.GITHUB_TOKEN?.trim(),
  allowedRepositories = configuredRepositories(),
) {
  function fail(message, status) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    fail('Enter a valid GitHub username.', 400);
  }
  if (!token) fail('Set GITHUB_TOKEN in .env, then restart the server.', 503);
  const names = [
    ...new Set(
      allowedRepositories
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (!names.length) {
    fail(
      'Add the owner/repository names selected for your token to config/repositories.json. No repositories were loaded.',
      503,
    );
  }
  if (
    names.some(
      (name) => !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[a-z\d_.-]+$/i.test(name),
    )
  ) {
    fail(
      'config/repositories.json must contain valid owner/repository names.',
      503,
    );
  }
  const repositories = [];
  for (const name of names.filter(
    (name) => name.split('/')[0] === username.toLowerCase(),
  )) {
    const response = await fetchApi(`https://api.github.com/repos/${name}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Nucleus',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const messages = {
        401: 'GitHub token is invalid or expired. Update GITHUB_TOKEN in .env and restart the server.',
        404: 'A configured repository does not exist or is not accessible with this token. Check config/repositories.json and token permissions.',
        403: 'GitHub rate limit or access restriction. Check token permissions or try again later.',
        429: 'GitHub rate limit reached. Try again later.',
      };
      fail(
        messages[response.status] || 'GitHub is unavailable. Try again later.',
        [401, 404].includes(response.status)
          ? response.status
          : [403, 429].includes(response.status)
            ? 429
            : 502,
      );
    }
    const repo = await response.json();
    // Do not follow a rename/transfer into a repository outside the allowlist.
    const fullName = `${repo.owner.login}/${repo.name}`.toLowerCase();
    if (fullName !== name)
      fail(
        'A configured repository was renamed or transferred. Update config/repositories.json before importing it.',
        409,
      );
    repositories.push({
      id: String(repo.id),
      name: repo.name,
      description: repo.description,
      language: repo.language,
      url: `https://github.com/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`,
      version: repo.default_branch,
      source: 'github',
      archived: repo.archived,
      private: Boolean(repo.private),
    });
  }
  return repositories.sort((a, b) => a.name.localeCompare(b.name));
}
module.exports = { listRepositories };
