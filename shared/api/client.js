/**
 * Send an HTTP request and return the parsed response.
 * Throws an error if the response is not ok.
 *
 * @param {string} path - The request URL or endpoint.
 * @param {object} options - Fetch options (method, headers, body, etc).
 * @returns {Promise<any>} The parsed JSON or text response payload.
 */
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
  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      payload?.error || payload?.message || `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload ?? null;
}

/**
 * Fetch data as JSON from the given path.
 *
 * @param {string} path - The request URL or endpoint.
 * @param {object} options - Fetch options.
 * @returns {Promise<any>} The JSON response payload.
 */
export async function fetchJson(path, options) {
  return request(path, options);
}

/**
 * Fetch JSON data but return null if response status is in ignoreStatuses.
 *
 * @param {string} path - The request URL or endpoint.
 * @param {object} [options={}] - Fetch options.
 * @param {number[]} [ignoreStatuses=[401, 403, 404]] - Status codes to ignore and return null.
 * @returns {Promise<any|null>} The JSON response or null.
 */
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

/**
 * Send a POST request with a JSON body.
 *
 * @param {string} path - The request URL or endpoint.
 * @param {object} body - The request body payload.
 * @param {object} [options={}] - Additional fetch options.
 * @returns {Promise<any>} The response payload.
 */
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

/**
 * Send a DELETE request with an optional JSON body.
 *
 * @param {string} path - The request URL or endpoint.
 * @param {object} body - The request body payload.
 * @param {object} [options={}] - Additional fetch options.
 * @returns {Promise<any>} The response payload.
 */
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

