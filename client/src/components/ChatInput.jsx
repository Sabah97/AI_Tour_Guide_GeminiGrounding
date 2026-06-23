import { useState } from 'react';

const MAX_CHARS = 4000;

export function ChatInput({ onSubmit, onCancel, isLoading, disabled }) {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text || isLoading) return;
    onSubmit(text);
    setValue('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const remaining = MAX_CHARS - value.length;

  return (
    <div className="chat-input-wrap">
      <div className="chat-input-shell">
        <textarea
          className="chat-input"
          rows={1}
          placeholder="Ask about nearby places, itineraries, travel times…"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-label="Message"
        />
        {isLoading ? (
          <button
            type="button"
            className="send-btn cancel"
            onClick={onCancel}
            aria-label="Stop generating"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="send-btn"
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        )}
      </div>
      <div className="char-count" aria-live="off">
        {remaining < 200 ? `${remaining} chars left` : 'Enter to send · Shift+Enter for newline'}
      </div>
    </div>
  );
}
