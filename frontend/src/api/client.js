// Same-origin: backend serves frontend/dist and the API on the same port.
// Auth flows via the .romaine.life session cookie, auto-attached by the
// browser. Set credentials: 'include' so fetch sends it.
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(path, { ...options, headers, credentials: 'include' });
    if (res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }

  if (!res) throw new Error('No response');

  if (res.status === 401) {
    // Only redirect for authenticated actions, not public reads.
    if (options.method && options.method !== 'GET') {
      const { startLogin } = await import('../auth/index.js');
      startLogin();
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined;
  return res.json();
}
