import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapLegend } from './MapLegend.jsx';

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
  console.log('[MapPanel] Places detail:', places.map(p => ({
    name: p.name,
    lat: p.latitude,
    lon: p.longitude,
    hasCoords: !!(p.latitude && p.longitude)
  })));
  
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

  // Count places with coordinates
  const placesWithCoords = places.filter(p => p.latitude && p.longitude);
  const placesWithoutCoords = places.filter(p => !p.latitude || !p.longitude);
  
  console.log('[MapPanel] Places with coordinates:', placesWithCoords.length);
  console.log('[MapPanel] Places without coordinates:', placesWithoutCoords.length);

  // Calculate map center (average of all place coordinates or user location)
  const centerLat = userLocation?.latitude || places.reduce((sum, p) => sum + (p.latitude || 0), 0) / places.length;
  const centerLon = userLocation?.longitude || places.reduce((sum, p) => sum + (p.longitude || 0), 0) / places.length;

  return (
    <div className={`map-aside ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="map-panel">
        <div className="map-panel-header">
          <h3>Map View</h3>
          <div className="map-panel-actions">
            <span className="map-panel-count">
              {placesWithCoords.length}/{places.length} located
            </span>
            <button 
              className="header-btn" 
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Minimize width' : 'Expand width'}
            >
              {isExpanded ? '⊟' : '⊞'}
            </button>
            <button 
              className="header-btn hide-map-btn" 
              onClick={onClose} 
              title="Hide map panel"
            >
              Hide Map
            </button>
          </div>
        </div>

        <div className="map-canvas">
          <MapLegend places={placesWithCoords} />
          
          {/* Warning banner for places without coordinates */}
          {placesWithoutCoords.length > 0 && (
            <div className="map-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                {placesWithoutCoords.length} place{placesWithoutCoords.length !== 1 ? 's' : ''} could not be located on map
              </span>
            </div>
          )}
          
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='Map © <a href="https://carto.com/">CARTO</a> | Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains={['a', 'b', 'c', 'd']}
              maxZoom={20}
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
                  icon={createPlaceIcon(place, selectedPlace?.id === place.id)}
                  eventHandlers={{
                    click: () => onPlaceClick(place),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '20px' }}>{place.icon}</span>
                        <strong style={{ flex: 1 }}>{place.name}</strong>
                      </div>
                      {place.distance && (
                        <div style={{ fontSize: '12px', color: '#a5acce', marginBottom: '4px' }}>
                          📏 {place.distance} away
                        </div>
                      )}
                      {place.description && (
                        <div style={{ fontSize: '13px', marginTop: '6px', color: '#e6e9f5' }}>
                          {place.description.substring(0, 120)}...
                        </div>
                      )}
                    </div>
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
                  href={`https://www.google.com/maps/place/?q=place_id:${selectedPlace.placeId.replace('places/', '')}`}
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
 * Create custom icon for place markers with type-based styling
 */
function createPlaceIcon(place, isSelected) {
  const icon = place.icon || '📍';
  const color = place.color || '#7c9cff';
  
  return L.divIcon({
    className: isSelected ? 'selected-marker' : 'place-marker',
    html: `
      <div class="custom-marker-pin ${isSelected ? 'is-selected' : ''}" 
           style="--marker-color: ${color}">
        <span class="marker-icon">${icon}</span>
        ${!isSelected ? `<span class="marker-type">${place.type || 'place'}</span>` : ''}
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
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
