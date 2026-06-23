import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GroundingPanel } from './GroundingPanel.jsx';
import { LoadingDots } from './LoadingDots.jsx';

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.error);

  return (
    <article
      className={[
        'bubble-row',
        isUser ? 'from-user' : 'from-model',
        isError ? 'is-error' : '',
        message.pending ? 'is-pending' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="bubble-avatar" aria-hidden="true">
        {isUser ? 'You' : 'AI'}
      </div>
      <div className="bubble-stack">
        <div className="bubble">
          {message.pending ? (
            <LoadingDots label="Gemini is querying Google Maps…" />
          ) : message.error ? (
            <div className="error-body">
              <strong>Request failed.</strong>
              <span>{message.error}</span>
            </div>
          ) : isUser ? (
            <p className="user-text">{message.text}</p>
          ) : (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && !message.pending && message.grounding && (
          <GroundingPanel grounding={message.grounding} />
        )}
      </div>
    </article>
  );
}
