import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * MapPanel - Displays places on an interactive map
 */
export function MapPanel({ places, userLocation, onPlaceClick, selectedPlace, onClose }) {
  console.log('[MapPanel] Rendering with', places.length, 'places');
  const [isExpanded, setIsExpanded] = useState(false);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch place details when a place is selected
  useEffect(() => {
    if (!selectedPlace) {
      setPlaceDetails(null);
      return;
    }

    // If we already have details for this place, don't fetch again
    if (placeDetails && placeDetails.placeName === selectedPlace.name) {
      return;
    }

    const fetchPlaceDetails = async () => {
      setLoadingDetails(true);
      try {
        const response = await fetch('/api/place-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeName: selectedPlace.name,
            placeId: selectedPlace.placeId,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPlaceDetails(data);
        } else {
          console.error('Failed to fetch place details');
          setPlaceDetails({ text: 'Unable to load details for this place.', placeName: selectedPlace.name });
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
        setPlaceDetails({ text: 'Unable to load details for this place.', placeName: selectedPlace.name });
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchPlaceDetails();
  }, [selectedPlace]);

  const handlePlaceClose = () => {
    setPlaceDetails(null);
    onPlaceClick(null);
  };

  if (!places || places.length === 0) {
    return (
      <div className="map-aside">
        <div className="map-panel">
          <div className="map-panel-header">
            <h3>Map View</h3>
            <button className="header-btn" onClick={onClose}>×</button>
          </div>
          <div className="map-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="muted">No places to display yet. Ask for recommendations!</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate map center (average of all place coordinates or user location)
  const centerLat = userLocation?.latitude || places.reduce((sum, p) => sum + (p.latitude || 0), 0) / places.length;
  const centerLon = userLocation?.longitude || places.reduce((sum, p) => sum + (p.longitude || 0), 0) / places.length;

  return (
    <div className={`map-aside ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="map-panel">
        <div className="map-panel-header">
          <h3>Map View</h3>
          <div className="map-panel-actions">
            <span className="map-panel-count">{places.length} place{places.length !== 1 ? 's' : ''}</span>
            <button 
              className="header-btn" 
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? '⊟' : '⊞'}
            </button>
            <button className="header-btn" onClick={onClose} title="Close map">×</button>
          </div>
        </div>

        <div className="map-canvas">
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User location marker */}
            {userLocation && (
              <Marker 
                position={[userLocation.latitude, userLocation.longitude]}
                icon={createUserIcon()}
              >
                <Popup>
                  <strong>Your Location</strong>
                  <br />
                  {userLocation.label || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                </Popup>
              </Marker>
            )}

            {/* Place markers */}
            {places.map((place, index) => (
              place.latitude && place.longitude && (
                <Marker
                  key={place.id || index}
                  position={[place.latitude, place.longitude]}
                  icon={createPlaceIcon(index + 1, selectedPlace?.id === place.id)}
                  eventHandlers={{
                    click: () => onPlaceClick(place),
                  }}
                >
                  <Popup>
                    <strong>{place.name}</strong>
                    {place.description && (
                      <>
                        <br />
                        <span className="muted">{place.description.substring(0, 100)}...</span>
                      </>
                    )}
                  </Popup>
                </Marker>
              )
            ))}

            <MapBoundsUpdater places={places} userLocation={userLocation} />
          </MapContainer>
        </div>

        {selectedPlace && (
          <div className="place-info">
            <div className="place-info-head">
              <div>
                <h4 className="place-info-name">{selectedPlace.name}</h4>
                {selectedPlace.distance && (
                  <p className="place-info-sub">{selectedPlace.distance} away</p>
                )}
              </div>
              <button className="place-info-close" onClick={handlePlaceClose}>×</button>
            </div>

            {loadingDetails && (
              <div className="place-info-body">
                <p className="muted">Loading details from Gemini...</p>
              </div>
            )}

            {!loadingDetails && placeDetails && (
              <div className="place-info-body md">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(placeDetails.text) }} />
              </div>
            )}

            {!loadingDetails && !placeDetails && selectedPlace.description && (
              <div className="place-info-body md">
                <p>{selectedPlace.description}</p>
              </div>
            )}

            <div className="place-info-meta">
              {selectedPlace.placeId && (
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${selectedPlace.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="meta-chip meta-link"
                >
                  View on Google Maps ↗
                </a>
              )}
              {placeDetails?.grounding?.sources && placeDetails.grounding.sources.length > 0 && (
                <span className="meta-chip">
                  Grounded by {placeDetails.grounding.sources.length} source{placeDetails.grounding.sources.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Component to auto-fit map bounds to show all markers
 */
function MapBoundsUpdater({ places, userLocation }) {
  const map = useMap();

  useEffect(() => {
    const bounds = [];
    
    if (userLocation) {
      bounds.push([userLocation.latitude, userLocation.longitude]);
    }
    
    places.forEach((place) => {
      if (place.latitude && place.longitude) {
        bounds.push([place.latitude, place.longitude]);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [places, userLocation, map]);

  return null;
}

/**
 * Create custom icon for user location
 */
function createUserIcon() {
  return L.divIcon({
    className: 'user-marker',
    html: '<div class="user-pin">📍</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

/**
 * Create custom icon for place markers
 */
function createPlaceIcon(number, isSelected) {
  return L.divIcon({
    className: isSelected ? 'selected-marker' : 'place-marker',
    html: `<div class="${isSelected ? 'selected-pin' : 'place-pin'}">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

/**
 * Simple markdown-to-HTML formatter
 */
function formatMarkdown(text) {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic
    .replace(/\n\n/g, '</p><p>') // Paragraphs
    .replace(/\n/g, '<br>') // Line breaks
    .replace(/^(.+)$/, '<p>$1</p>'); // Wrap in paragraph
}
