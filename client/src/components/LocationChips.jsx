import { useState } from 'react';
import { PRESET_LOCATIONS } from '../lib/locations.js';

/**
 * Location selector. Sets a preset or accepts custom lat/lng.
 * Selected location flows into the next chat request as
 * toolConfig.retrievalConfig.latLng (server-side).
 */
export function LocationChips({ value, onChange, disabled }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [customErr, setCustomErr] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handlePreset = (id) => {
    setShowCustom(false);
    const p = PRESET_LOCATIONS.find((l) => l.id === id);
    if (!p) return;
    if (p.latitude == null) {
      onChange(null);
    } else {
      onChange({ latitude: p.latitude, longitude: p.longitude, label: p.label });
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setCustomErr('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setCustomErr(null);
    setShowCustom(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Try to get address name using reverse geocoding
        let locationLabel = `Your Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`
          );
          if (response.ok) {
            const data = await response.json();
            // Extract city/area name
            const area = data.address?.neighbourhood || 
                        data.address?.suburb || 
                        data.address?.city || 
                        data.address?.state || 
                        'Your Location';
            locationLabel = `${area} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
          }
        } catch (err) {
          // Fallback to coordinates only if reverse geocoding fails
          console.warn('Reverse geocoding failed:', err);
        }
        
        onChange({
          latitude: lat,
          longitude: lon,
          label: locationLabel,
        });
        setGettingLocation(false);
      },
      (error) => {
        let message = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location access denied. Please enable location permissions.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information unavailable';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out';
        }
        setCustomErr(message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleCustomApply = () => {
    setCustomErr(null);
    const lat = Number.parseFloat(customLat);
    const lon = Number.parseFloat(customLon);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setCustomErr('Latitude must be a number in [-90, 90]');
      return;
    }
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
      setCustomErr('Longitude must be a number in [-180, 180]');
      return;
    }
    onChange({ latitude: lat, longitude: lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
  };

  const activeId = value ? PRESET_LOCATIONS.find((p) => p.latitude === value.latitude && p.longitude === value.longitude)?.id || 'custom' : 'none';

  return (
    <div className="location-chips" aria-label="Location context">
      <span className="loc-label">Location:</span>
      
      <button
        type="button"
        className={`loc-chip loc-chip-gps${gettingLocation ? ' is-loading' : ''}`}
        onClick={handleUseMyLocation}
        disabled={disabled || gettingLocation}
        title="Use my current GPS location"
      >
        {gettingLocation ? '📍 Getting location...' : '📍 Use My Location'}
      </button>
      
      {PRESET_LOCATIONS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`loc-chip${activeId === p.id ? ' is-active' : ''}`}
          onClick={() => handlePreset(p.id)}
          disabled={disabled}
          title={p.latitude == null ? 'No location context' : `lat=${p.latitude}, lon=${p.longitude}`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        className={`loc-chip${showCustom ? ' is-active' : ''}`}
        onClick={() => setShowCustom((v) => !v)}
        disabled={disabled}
      >
        Custom…
      </button>

      {showCustom && (
        <div className="loc-custom" role="group" aria-label="Custom coordinates">
          <input
            type="number"
            step="0.0001"
            placeholder="Latitude"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            className="loc-input"
            disabled={disabled}
            aria-label="Latitude"
          />
          <input
            type="number"
            step="0.0001"
            placeholder="Longitude"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            className="loc-input"
            disabled={disabled}
            aria-label="Longitude"
          />
          <button
            type="button"
            className="loc-apply"
            onClick={handleCustomApply}
            disabled={disabled || !customLat || !customLon}
          >
            Apply
          </button>
        </div>
      )}

      {customErr && <span className="loc-err">{customErr}</span>}

      {value && (
        <span className="loc-active" title="Attached to next request as toolConfig.retrievalConfig.latLng">
          📍 {value.label}
        </span>
      )}
    </div>
  );
}
