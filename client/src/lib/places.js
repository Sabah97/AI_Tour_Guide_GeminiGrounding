/**
 * Extract place names and details from Gemini response text
 * Looks for markdown headings (###) or numbered lists
 */
export function extractPlaces(text, grounding) {
  const places = [];
  
  // Pattern 1: Markdown level-3 headings (### Place Name)
  const headingPattern = /###\s+(.+?)(?:\n|$)/g;
  let match;
  let placeIndex = 0;

  while ((match = headingPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const startPos = match.index + match[0].length;
    const nextHeading = text.indexOf('###', startPos);
    const description = text.substring(
      startPos,
      nextHeading > 0 ? nextHeading : text.length
    ).trim();

    places.push({
      id: `place-${placeIndex++}`,
      name,
      description: description.substring(0, 300), // First 300 chars
      latitude: null,
      longitude: null,
    });
  }

  // Pattern 2: Numbered lists (1. Place Name, 2. Place Name, etc.)
  if (places.length === 0) {
    const listPattern = /^\d+\.\s+\*\*(.+?)\*\*/gm;
    while ((match = listPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const startPos = match.index + match[0].length;
      const nextItem = text.substring(startPos).search(/^\d+\.\s+/m);
      const description = text.substring(
        startPos,
        nextItem > 0 ? startPos + nextItem : text.length
      ).trim();

      places.push({
        id: `place-${placeIndex++}`,
        name,
        description: description.substring(0, 300),
        latitude: null,
        longitude: null,
      });
    }
  }

  // Try to match places with grounding sources (Maps data)
  if (grounding && grounding.sources) {
    const mapsSources = grounding.sources.filter((s) => s.kind === 'maps');
    
    places.forEach((place) => {
      // Try to find matching source by name similarity
      const matchingSource = mapsSources.find((source) => {
        if (!source.title) return false;
        const titleLower = source.title.toLowerCase();
        const nameLower = place.name.toLowerCase();
        return titleLower.includes(nameLower) || nameLower.includes(titleLower);
      });

      if (matchingSource) {
        place.placeId = matchingSource.placeId;
        place.uri = matchingSource.uri;
      }
    });
  }

  return places;
}

/**
 * Geocode place names to lat/lng using Nominatim (OpenStreetMap)
 */
export async function geocodePlaces(places, userLocation) {
  const geocoded = [];

  for (const place of places) {
    try {
      // Build search query with user location context
      let searchQuery = place.name;
      if (userLocation) {
        searchQuery += `, near ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=en`
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          geocoded.push({
            ...place,
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          });
        } else {
          // Fallback: try without location context
          const fallbackResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(place.name)}&format=json&limit=1&accept-language=en`
          );
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData && fallbackData.length > 0) {
              geocoded.push({
                ...place,
                latitude: parseFloat(fallbackData[0].lat),
                longitude: parseFloat(fallbackData[0].lon),
                displayName: fallbackData[0].display_name,
              });
            } else {
              geocoded.push(place); // Keep original without coordinates
            }
          }
        }
      } else {
        geocoded.push(place);
      }

      // Respect Nominatim usage policy: max 1 request per second
      await sleep(1000);
    } catch (err) {
      console.warn(`Failed to geocode ${place.name}:`, err);
      geocoded.push(place);
    }
  }

  return geocoded;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
