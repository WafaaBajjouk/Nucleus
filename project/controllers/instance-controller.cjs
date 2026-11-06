async function handleInstanceRequest(request, response, instances) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (
    pathname !== '/api/engine' &&
    pathname !== '/api/instances' &&
    !pathname.startsWith('/api/instances/')
  )
    return false;

  const json = (status, body) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
  };

  try {
    const host = new URL(`http://${request.headers.host}`);
    if (
      !['localhost', '127.0.0.1'].includes(host.hostname) ||
      (request.headers.origin && request.headers.origin !== host.origin) ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      json(403, { error: 'Use Nucleus from its local address.' });
      return true;
    }

    if (
      pathname === '/api/engine' &&
      ['GET', 'HEAD'].includes(request.method)
    ) {
      json(200, await instances.engineStatus());
    } else if (
      pathname === '/api/instances' &&
      ['GET', 'HEAD'].includes(request.method)
    ) {
      json(200, await instances.list());
    } else if (pathname === '/api/instances' && request.method === 'POST') {
      if (
        request.headers['content-type']?.split(';')[0].trim() !==
        'application/json'
      ) {
        json(415, { error: 'Send application/json.' });
        return true;
      }
      let text = '';
      for await (const chunk of request) {
        text += chunk;
        if (Buffer.byteLength(text) > 1024) {
          json(413, { error: 'Request is too large.' });
          return true;
        }
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        json(400, { error: 'Invalid JSON.' });
        return true;
      }
      if (!data || typeof data.projectId !== 'string') {
        json(400, { error: 'A projectId is required.' });
        return true;
      }
      json(202, await instances.launch(data.projectId));
    } else if (
      pathname.startsWith('/api/instances/') &&
      request.method === 'DELETE'
    ) {
      const id = pathname.slice('/api/instances/'.length);
      if (!/^nucleus-[a-f0-9-]{36}$/.test(id)) {
        json(404, { error: 'Unknown instance.' });
        return true;
      }
      await instances.remove(id);
      json(200, { removed: true });
    } else {
      response.setHeader(
        'Allow',
        pathname === '/api/engine'
          ? 'GET, HEAD'
          : pathname === '/api/instances'
            ? 'GET, HEAD, POST'
            : 'DELETE',
      );
      json(405, { error: 'Method not allowed.' });
    }
  } catch (error) {
    json(error.status || 500, {
      error: error.status
        ? error.message
        : 'Could not complete the instance operation.',
    });
  }
  return true;
}

module.exports = { handleInstanceRequest };
