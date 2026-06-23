export function LoadingDots({ label = 'Thinking…' }) {
  return (
    <div className="loading-dots" role="status" aria-live="polite">
      <span className="dots">
        <span /><span /><span />
      </span>
      <span className="loading-label">{label}</span>
    </div>
  );
}
