import { useCallback, useRef, useState } from 'react';
import { request, ApiError } from '../lib/api.js';

/**
 * Multi-turn chat state + server calls.
 * Holds conversation in local state, sends full history on each turn,
 * so the server can route each turn to Gemini with grounding context intact.
 */
export function useChat() {
  const [messages, setMessages] = useState([]); // [{ id, role, text, grounding?, error?, pending? }]
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const send = useCallback(
    async (text, opts = {}) => {
      const trimmed = (text || '').trim();
      if (!trimmed || isLoading) return;

      setError(null);
      const userMsg = {
        id: cryptoRandomId(),
        role: 'user',
        text: trimmed,
        ts: Date.now(),
      };
      const placeholder = {
        id: cryptoRandomId(),
        role: 'model',
        text: '',
        pending: true,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, placeholder]);

      const historyForServer = [...messages, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const body = { messages: historyForServer };
      if (opts.location && typeof opts.location.latitude === 'number' && typeof opts.location.longitude === 'number') {
        body.location = {
          latitude: opts.location.latitude,
          longitude: opts.location.longitude,
        };
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setIsLoading(true);

      try {
        const data = await request('/api/chat', {
          body,
          signal: ctrl.signal,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? {
                  ...m,
                  pending: false,
                  text: data.text || '(empty response)',
                  grounding: data.grounding || null,
                  finishReason: data.finishReason || null,
                }
              : m,
          ),
        );
      } catch (e) {
        if (e?.name === 'AbortError') {
          setMessages((prev) => prev.filter((m) => m.id !== placeholder.id));
        } else {
          const msg = e instanceof ApiError ? e.message : e?.message || 'unknown error';
          setError(msg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholder.id
                ? { ...m, pending: false, error: msg, text: m.text || '' }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, send, cancel, reset };
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
