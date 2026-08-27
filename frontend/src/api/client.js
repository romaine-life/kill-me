// Same-origin: backend serves frontend/dist and the API on the same port.
// Auth flows via the .romaine.life session cookie, auto-attached by the
// browser. Set credentials: 'include' so fetch sends it.
import { startLogin } from '../auth/index.js';

export async function apiFetch(path, options = {}) {
  const { timeoutMs = 10_000, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    fetchOptions.signal?.addEventListener('abort', abortFromCaller, { once: true });
    try {
      res = await fetch(path, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      fetchOptions.signal?.removeEventListener('abort', abortFromCaller);
    }
    if (res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }

  if (!res) throw new Error('No response');

  if (res.status === 401) {
    // Only redirect for authenticated actions, not public reads.
    if (options.method && options.method !== 'GET') {
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
