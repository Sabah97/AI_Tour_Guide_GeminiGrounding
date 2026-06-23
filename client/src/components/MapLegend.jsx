import { useState } from 'react';

/**
 * MapLegend - Shows icon types legend on the map
 */
export function MapLegend({ places }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique place types from the places array
  const placeTypes = [];
  const seenTypes = new Set();

  places.forEach((place) => {
    if (place.type && !seenTypes.has(place.type)) {
      seenTypes.add(place.type);
      placeTypes.push({
        type: place.type,
        icon: place.icon,
        color: place.color,
      });
    }
  });

  if (placeTypes.length === 0) return null;

  return (
    <div className="map-legend">
      <button
        className="legend-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Hide legend' : 'Show legend'}
      >
        <span className="legend-icon">🏷️</span>
        <span className="legend-label">Legend</span>
        <span className="legend-chev">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="legend-content">
          <div className="legend-grid">
            {placeTypes.map((pt) => (
              <div key={pt.type} className="legend-item">
                <span
                  className="legend-marker"
                  style={{ background: pt.color }}
                >
                  {pt.icon}
                </span>
                <span className="legend-type">{pt.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
