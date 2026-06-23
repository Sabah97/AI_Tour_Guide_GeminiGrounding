export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span className="error-icon" aria-hidden="true">!</span>
      <span className="error-msg">{message}</span>
      <button
        type="button"
        className="error-close"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
