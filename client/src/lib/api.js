// Thin fetch wrapper. Keeps API base + error shape consistent.
import { config } from '../config.js';

class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? null;
    this.code = code ?? null;
  }
}

async function request(path, { method = 'POST', body, signal } = {}) {
  const url = `${config.apiBase}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(`Network error: ${e?.message || 'fetch failed'}`, { status: 0 });
  }

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    const code = (data && data.code) || null;
    throw new ApiError(msg, { status: res.status, code });
  }
  return data;
}

export { request, ApiError };
