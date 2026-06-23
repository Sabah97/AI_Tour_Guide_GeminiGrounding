import { MessageBubble } from './MessageBubble.jsx';

export function MessageList({ messages }) {
  return (
    <div className="message-list" role="log" aria-live="polite" aria-relevant="additions text">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </div>
  );
}
