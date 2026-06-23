import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header.jsx';
import { MessageList } from './components/MessageList.jsx';
import { ChatInput } from './components/ChatInput.jsx';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { LocationChips } from './components/LocationChips.jsx';
import { useChat } from './hooks/useChat.js';
import { config } from './config.js';

const SAMPLE_PROMPTS = [
  "I'm in Uttara Sector 4, Dhaka. Plan a 1-hour quiet reading itinerary within 1 km walking distance — calm cafés only. Include travel time, walking distance, and why each place suits reading.",
  "I'm near Gulshan 2. Find 3 highly-rated quiet restaurants within 15 min walking distance. List travel time and walking distance for each.",
  "I'm at Dhanmondi Lake. Suggest a 45-min evening stroll route with one quiet café stop. Explain your confidence level per recommendation.",
];

export default function App() {
  const { messages, isLoading, error, send, cancel, reset } = useChat();
  const listRef = useRef(null);
  const [location, setLocation] = useState(null);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (text) => send(text, { location });

  return (
    <div className="app-shell">
      <Header onReset={reset} hasMessages={messages.length > 0} />

      <main className="chat-main" ref={listRef}>
        {messages.length === 0 ? (
          <EmptyState prompts={SAMPLE_PROMPTS} onPick={handleSubmit} disabled={isLoading} />
        ) : (
          <MessageList messages={messages} />
        )}
      </main>

      <ErrorBanner message={error} onDismiss={() => null} />

      <footer className="chat-footer">
        <LocationChips value={location} onChange={setLocation} disabled={isLoading} />
        <ChatInput
          onSubmit={handleSubmit}
          onCancel={cancel}
          isLoading={isLoading}
          disabled={false}
        />
        <p className="footer-note">
          Grounded by Google Maps via Gemini. Responses may include place data, citations, and
          model assumptions. Verify time-sensitive info.
          {location
            ? ` Using location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}.`
            : ' No location context — pick one above for nearby-grounded results.'}
        </p>
      </footer>
    </div>
  );
}

function EmptyState({ prompts, onPick, disabled }) {
  return (
    <div className="empty-state">
      <h2>Ask about places nearby</h2>
      <p>Powered by Gemini with Google Maps Grounding. Try one of these:</p>
      <ul className="prompt-suggestions">
        {prompts.map((p) => (
          <li key={p}>
            <button
              type="button"
              className="suggestion"
              onClick={() => onPick(p)}
              disabled={disabled}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
