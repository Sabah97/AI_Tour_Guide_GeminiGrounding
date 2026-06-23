import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header.jsx';
import { MessageList } from './components/MessageList.jsx';
import { ChatInput } from './components/ChatInput.jsx';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { LocationChips } from './components/LocationChips.jsx';
import { MapPanel } from './components/MapPanel.jsx';
import { useChat } from './hooks/useChat.js';
import { extractPlaces, geocodePlaces, calculateDistance } from './lib/places.js';
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
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isGeocodingPlaces, setIsGeocodingPlaces] = useState(false);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Extract and geocode places when new AI message arrives
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'model' || lastMessage.pending) return;

    console.log('[App] Extracting places from message:', lastMessage.text.substring(0, 100));
    const extractedPlaces = extractPlaces(lastMessage.text, lastMessage.grounding);
    console.log('[App] Extracted places:', extractedPlaces);
    
    if (extractedPlaces.length > 0) {
      console.log('[App] Starting geocoding for', extractedPlaces.length, 'places');
      setIsGeocodingPlaces(true);
      setShowMap(true);
      console.log('[App] showMap set to true');
      
      geocodePlaces(extractedPlaces, location)
        .then((geocoded) => {
          console.log('[App] Geocoded places:', geocoded);
          // Add distance from user location
          const withDistance = geocoded.map((place) => {
            if (location && place.latitude && place.longitude) {
              place.distance = calculateDistance(
                location.latitude,
                location.longitude,
                place.latitude,
                place.longitude
              );
            }
            return place;
          });
          setPlaces(withDistance);
          console.log('[App] Places set, count:', withDistance.length);
          setIsGeocodingPlaces(false);
        })
        .catch((err) => {
          console.error('Geocoding failed:', err);
          setPlaces(extractedPlaces);
          setIsGeocodingPlaces(false);
        });
    } else {
      console.log('[App] No places extracted from response');
    }
  }, [messages, location]);

  const handleSubmit = (text) => send(text, { location });

  const handlePlaceClick = (place) => {
    setSelectedPlace(place);
  };

  const handleMapClose = () => {
    console.log('[App] Map hide button clicked - setting showMap to false');
    setShowMap(false);
    setSelectedPlace(null);
  };

  return (
    <div className={`app-shell ${showMap ? 'has-map' : ''}`}>
      <Header onReset={reset} hasMessages={messages.length > 0} />

      <div className="chat-with-map">
        <main className="chat-main" ref={listRef}>
          {messages.length === 0 ? (
            <EmptyState prompts={SAMPLE_PROMPTS} onPick={handleSubmit} disabled={isLoading} />
          ) : (
            <MessageList messages={messages} />
          )}
          
          {/* Floating button to show map when hidden */}
          {!showMap && places.length > 0 && (
            <button 
              className="show-map-btn"
              onClick={() => setShowMap(true)}
              title="Show map panel"
            >
              ▶ Show Map ({places.length})
            </button>
          )}
        </main>

        {showMap && (
          <MapPanel
            places={places}
            userLocation={location}
            onPlaceClick={handlePlaceClick}
            selectedPlace={selectedPlace}
            onClose={handleMapClose}
          />
        )}
      </div>

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
          {isGeocodingPlaces && ' • Loading places on map...'}
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
