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

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network/connection issues)
 */
function isRetryableError(error) {
  // Retry on network errors (ECONNRESET, ECONNREFUSED, etc.)
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) return true;
  if (error?.message?.includes('ECONNRESET')) return true;
  if (error?.message?.includes('ECONNREFUSED')) return true;
  if (error?.message?.includes('Network error')) return true;
  return false;
}

async function request(path, { method = 'POST', body, signal, maxRetries = 3 } = {}) {
  const url = `${config.apiBase}${path}`;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = (data && data.error) || `HTTP ${res.status}`;
        const code = (data && data.code) || null;
        throw new ApiError(msg, { status: res.status, code });
      }
      
      return data;
    } catch (e) {
      // Don't retry if aborted by user
      if (e?.name === 'AbortError') throw e;
      
      lastError = e;
      
      // Check if we should retry
      const shouldRetry = attempt < maxRetries - 1 && isRetryableError(e);
      
      if (shouldRetry) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt);
        console.warn(`[api] Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, e?.message);
        await sleep(delay);
        continue;
      }
      
      // Not retryable or max retries reached
      if (e instanceof ApiError) throw e;
      throw new ApiError(`Network error: ${e?.message || 'fetch failed'}`, { status: 0 });
    }
  }
  
  // Should never reach here, but just in case
  throw lastError;
}

export { request, ApiError };
