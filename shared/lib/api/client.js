async function request(path, { method = 'GET', headers, body, credentials = 'include', ...rest } = {}) {
  const init = {
    method,
    credentials,
    headers: {
      ...(headers || {}),
    },
    ...rest,
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!init.headers['Content-Type']) {
      init.headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(path, init);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload ?? null;
}

export async function fetchJson(path, options) {
  return request(path, options);
}

export async function fetchJsonOrNull(path, options = {}, ignoreStatuses = [401, 403, 404]) {
  try {
    return await request(path, options);
  } catch (error) {
    if (ignoreStatuses.includes(error.status)) {
      return null;
    }
    throw error;
  }
}

export async function postJson(path, body, options = {}) {
  return request(
    path,
    {
      ...options,
      method: options.method || 'POST',
      body,
    }
  );
}

export async function deleteJson(path, body, options = {}) {
  return request(
    path,
    {
      ...options,
      method: 'DELETE',
      body,
    }
  );
}

