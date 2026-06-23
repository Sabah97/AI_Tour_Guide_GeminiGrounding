export function Header({ onReset, hasMessages }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">◉</span>
        <div>
          <h1>AI Tour Guide</h1>
          <p className="brand-sub">Gemini · Google Maps Grounding</p>
        </div>
      </div>
      <div className="header-actions">
        <a
          className="header-link"
          href="https://ai.google.dev/gemini-api/docs/maps-grounding"
          target="_blank"
          rel="noreferrer noopener"
        >
          Docs ↗
        </a>
        {hasMessages && (
          <button type="button" className="header-btn" onClick={onReset}>
            New chat
          </button>
        )}
      </div>
    </header>
  );
}
