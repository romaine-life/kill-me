// Same-origin: the backend (backend/server.js) serves both frontend/dist and
// the API on the same port, so every path is relative.
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(path, { ...options, headers });
    if (res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }

  if (!res) throw new Error('No response');

  if (res.status === 401) {
    localStorage.removeItem('token');
    // Only redirect for authenticated actions, not public reads. The auth
    // service does the Microsoft dance and sends the user back here.
    if (options.method && options.method !== 'GET') {
      const cb = encodeURIComponent(window.location.origin + window.location.pathname);
      window.location.href = `https://auth.romaine.life/api/auth/sign-in/social/microsoft?callbackURL=${cb}`;
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
