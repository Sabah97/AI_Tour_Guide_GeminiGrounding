import { useState } from 'react';

/**
 * Render grounding metadata as collapsible panel.
 * Distinguishes: Maps sources, Web sources, search queries, widget token.
 */
export function GroundingPanel({ grounding }) {
  const [open, setOpen] = useState(false);
  const maps = grounding.sources.filter((s) => s.kind === 'maps');
  const web = grounding.sources.filter((s) => s.kind === 'web');
  const total = grounding.sources.length;

  if (total === 0 && !grounding.widgetContextToken && grounding.searchQueries.length === 0) {
    return null;
  }

  const widgetUrl = grounding.widgetContextToken
    ? `https://www.google.com/maps/embed?ctx=${encodeURIComponent(grounding.widgetContextToken)}`
    : null;

  return (
    <section className="grounding-panel" aria-label="Grounding sources">
      <button
        type="button"
        className="grounding-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="dot" aria-hidden="true" />
        <span className="label">
          Grounded by {total} source{total === 1 ? '' : 's'}
          {maps.length > 0 && ` · ${maps.length} from Google Maps`}
          {web.length > 0 && ` · ${web.length} from web`}
        </span>
        <span className="chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="grounding-body">
          {grounding.searchQueries.length > 0 && (
            <div className="grounding-section">
              <h4>Search queries</h4>
              <ul className="chip-list">
                {grounding.searchQueries.map((q, i) => (
                  <li key={i} className="chip">{q}</li>
                ))}
              </ul>
            </div>
          )}

          {maps.length > 0 && (
            <div className="grounding-section">
              <h4>Google Maps</h4>
              <ul className="source-list">
                {maps.map((s, i) => (
                  <li key={`m-${i}`}>
                    <span className="src-kind kind-maps">Maps</span>
                    {s.uri ? (
                      <a href={s.uri} target="_blank" rel="noreferrer noopener">
                        {s.title || s.uri}
                      </a>
                    ) : (
                      <span>{s.title || `Place ${s.placeId || i + 1}`}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {web.length > 0 && (
            <div className="grounding-section">
              <h4>Web</h4>
              <ul className="source-list">
                {web.map((s, i) => (
                  <li key={`w-${i}`}>
                    <span className="src-kind kind-web">Web</span>
                    {s.uri ? (
                      <a href={s.uri} target="_blank" rel="noreferrer noopener">
                        {s.title || s.uri}
                      </a>
                    ) : (
                      <span>{s.title || `Source ${i + 1}`}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grounding.supports.length > 0 && (
            <div className="grounding-section">
              <h4>Citations ({grounding.supports.length})</h4>
              <p className="muted">
                Each response segment is tied to {grounding.supports.length} grounded
                source{grounding.supports.length === 1 ? '' : 's'}. Confidence scores
                reported inline when available.
              </p>
            </div>
          )}

          {widgetUrl && (
            <div className="grounding-section">
              <h4>Map widget</h4>
              <a href={widgetUrl} target="_blank" rel="noreferrer noopener">
                Open grounded map view ↗
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
