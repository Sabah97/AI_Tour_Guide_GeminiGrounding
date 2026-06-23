/**
 * Categorize place types based on keywords in name and description
 */
export function categorizePlaceType(placeName, description) {
  const text = `${placeName} ${description}`.toLowerCase();
  
  // Define place type patterns with priorities (check most specific first)
  const patterns = [
    { 
      type: 'restaurant', 
      keywords: ['restaurant', 'dining', 'eatery', 'bistro', 'brasserie', 'grill', 'diner', 'food court'],
      icon: '🍽️',
      color: '#ff6b6b'
    },
    { 
      type: 'cafe', 
      keywords: ['café', 'cafe', 'coffee', 'espresso', 'tea house', 'coffeehouse'],
      icon: '☕',
      color: '#8b5a3c'
    },
    { 
      type: 'museum', 
      keywords: ['museum', 'gallery', 'art', 'exhibition', 'archive'],
      icon: '🏛️',
      color: '#9b59b6'
    },
    { 
      type: 'park', 
      keywords: ['park', 'garden', 'green', 'botanical', 'playground', 'lake'],
      icon: '🌳',
      color: '#4ade80'
    },
    { 
      type: 'shopping', 
      keywords: ['shop', 'mall', 'market', 'store', 'boutique', 'bazaar', 'retail'],
      icon: '🛍️',
      color: '#f59e0b'
    },
    { 
      type: 'landmark', 
      keywords: ['monument', 'landmark', 'tower', 'building', 'statue', 'memorial', 'bridge', 'gate'],
      icon: '🗼',
      color: '#3b82f6'
    },
    { 
      type: 'entertainment', 
      keywords: ['cinema', 'theater', 'theatre', 'concert', 'club', 'bar', 'pub', 'nightlife'],
      icon: '🎭',
      color: '#ec4899'
    },
    { 
      type: 'hotel', 
      keywords: ['hotel', 'resort', 'hostel', 'accommodation', 'inn', 'lodge'],
      icon: '🏨',
      color: '#6366f1'
    },
    { 
      type: 'religious', 
      keywords: ['mosque', 'masjid', 'church', 'temple', 'shrine', 'monastery', 'synagogue'],
      icon: '🕌',
      color: '#10b981'
    },
    { 
      type: 'beach', 
      keywords: ['beach', 'coast', 'shore', 'seaside', 'waterfront'],
      icon: '🏖️',
      color: '#0ea5e9'
    },
    { 
      type: 'sports', 
      keywords: ['stadium', 'sports', 'gym', 'fitness', 'arena', 'court'],
      icon: '⚽',
      color: '#84cc16'
    },
    { 
      type: 'hospital', 
      keywords: ['hospital', 'clinic', 'medical', 'health', 'pharmacy'],
      icon: '🏥',
      color: '#ef4444'
    },
    { 
      type: 'education', 
      keywords: ['school', 'university', 'college', 'library', 'institute', 'academy'],
      icon: '🏫',
      color: '#8b5cf6'
    },
  ];
  
  // Find first matching pattern
  for (const pattern of patterns) {
    if (pattern.keywords.some(keyword => text.includes(keyword))) {
      return pattern;
    }
  }
  
  // Default for unmatched places
  return { 
    type: 'generic', 
    icon: '📍', 
    color: '#7c9cff' 
  };
}

/**
 * Extract place names and details from Gemini response text
 * Looks for markdown headings (###) or numbered lists
 */
export function extractPlaces(text, grounding) {
  const places = [];
  
  console.log('[extractPlaces] Input text length:', text?.length);
  console.log('[extractPlaces] Grounding sources:', grounding?.sources?.length);
  
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

    const placeType = categorizePlaceType(name, description);

    // Try to extract address from description
    const addressMatch = description.match(/\*\*Address:\*\*\s*(.+?)(?:\n|\*\*|$)/i);
    const fullAddress = addressMatch ? addressMatch[1].trim() : null;

    places.push({
      id: `place-${placeIndex++}`,
      name,
      description: description.substring(0, 300), // First 300 chars
      address: fullAddress, // Store extracted address
      latitude: null,
      longitude: null,
      type: placeType.type,
      icon: placeType.icon,
      color: placeType.color,
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

      const placeType = categorizePlaceType(name, description);

      // Try to extract address from description
      const addressMatch = description.match(/\*\*Address:\*\*\s*(.+?)(?:\n|\*\*|$)/i);
      const fullAddress = addressMatch ? addressMatch[1].trim() : null;

      places.push({
        id: `place-${placeIndex++}`,
        name,
        description: description.substring(0, 300),
        address: fullAddress, // Store extracted address
        latitude: null,
        longitude: null,
        type: placeType.type,
        icon: placeType.icon,
        color: placeType.color,
      });
    }
  }

  console.log('[extractPlaces] Extracted', places.length, 'places from text');

  // Try to match places with grounding sources (Maps data)
  if (grounding && grounding.sources) {
    const mapsSources = grounding.sources.filter((s) => s.kind === 'maps');
    console.log('[extractPlaces] Found', mapsSources.length, 'maps sources in grounding');
    
    places.forEach((place, index) => {
      // Try to find matching source by name similarity
      const matchingSource = mapsSources.find((source) => {
        if (!source.title) return false;
        const titleLower = source.title.toLowerCase();
        const nameLower = place.name.toLowerCase();
        const matches = titleLower.includes(nameLower) || nameLower.includes(titleLower);
        if (matches) {
          console.log(`[extractPlaces] Matched "${place.name}" with grounding source "${source.title}"`);
        }
        return matches;
      });

      if (matchingSource) {
        place.placeId = matchingSource.placeId;
        place.uri = matchingSource.uri;
        console.log(`[extractPlaces] Place ${index}: ${place.name} has placeId:`, place.placeId);
      } else {
        console.log(`[extractPlaces] Place ${index}: ${place.name} has NO placeId`);
      }
    });
  }

  console.log('[extractPlaces] Final places:', places);
  return places;
}

/**
 * Use Google Maps grounding data to get coordinates when available
 * Falls back to Nominatim geocoding for places without grounding data
 */
export async function geocodePlaces(places, userLocation) {
  const geocoded = [];
  
  console.log('=================================================');
  console.log('[geocodePlaces] Starting geocoding for', places.length, 'places');
  console.log('[geocodePlaces] User location:', userLocation);
  console.log('=================================================');

  for (const place of places) {
    console.log(`\n[geocodePlaces] --- Processing: "${place.name}" ---`);
    console.log(`[geocodePlaces] Place data:`, { 
      name: place.name,
      placeId: place.placeId,
      uri: place.uri,
      address: place.address,
    });
    
    try {
      let foundCoordinates = false;
      let result = { ...place };
      
      // STRATEGY 1: If we have Google Maps place_id, use server to get coordinates
      if (place.placeId) {
        console.log(`[geocodePlaces] Place has Google Maps placeId: ${place.placeId}`);
        console.log(`[geocodePlaces] Requesting coordinates from server...`);
        
        try {
          const response = await fetch('/api/geocode-place-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              placeId: place.placeId,
              placeName: place.name
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[geocodePlaces] Server response:`, data);
            if (data.latitude && data.longitude) {
              result.latitude = data.latitude;
              result.longitude = data.longitude;
              console.log(`[geocodePlaces] ✓✓✓ Got coords from Google Maps placeId: ${result.latitude}, ${result.longitude}`);
              foundCoordinates = true;
            } else {
              console.warn(`[geocodePlaces] Server response missing coordinates`);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`[geocodePlaces] Server geocode-place-id returned ${response.status}:`, errorData);
          }
        } catch (err) {
          console.error(`[geocodePlaces] Error calling geocode-place-id:`, err.message);
        }
        
        // Wait to respect rate limits
        if (!foundCoordinates) {
          await sleep(1100);
        }
      }
      
      // Also try to extract from URI if available
      if (!foundCoordinates && place.uri) {
        console.log(`[geocodePlaces] Checking Google Maps URI: ${place.uri}`);
        const coordsMatch = place.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordsMatch) {
          result.latitude = parseFloat(coordsMatch[1]);
          result.longitude = parseFloat(coordsMatch[2]);
          console.log(`[geocodePlaces] ✓✓✓ Extracted coords from URI: ${result.latitude}, ${result.longitude}`);
          foundCoordinates = true;
        }
      }
      
      // STRATEGY 2: If still no coordinates, use Nominatim geocoding
      if (!foundCoordinates) {
        console.log(`[geocodePlaces] Trying Nominatim geocoding...`);
        
        // Build search queries with multiple strategies
        const searchStrategies = [];
        
        // Try extracted address first
        if (place.address) {
          searchStrategies.push({
            name: 'Full Address',
            query: place.address
          });
          searchStrategies.push({
            name: 'Name + Address',
            query: `${place.name}, ${place.address}`
          });
        }
        
        // Try with location context
        if (userLocation && userLocation.label) {
          const locationParts = userLocation.label.split(',').map(p => p.trim());
          searchStrategies.push({
            name: 'Name + Location',
            query: `${place.name}, ${locationParts.join(', ')}`
          });
          if (locationParts.length > 1) {
            searchStrategies.push({
              name: 'Name + City',
              query: `${place.name}, ${locationParts[locationParts.length - 1]}`
            });
          }
        }
        
        // Last resort: just the name
        searchStrategies.push({
          name: 'Name Only',
          query: place.name
        });
        
        console.log(`[geocodePlaces] Will try ${searchStrategies.length} Nominatim strategies`);
        
        let bestNominatimResult = null;
        
        // Try each strategy
        for (const strategy of searchStrategies) {
          if (bestNominatimResult) break;
          
          console.log(`[geocodePlaces] Trying: "${strategy.name}" = "${strategy.query}"`);
          
          let nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(strategy.query)}&format=json&limit=5&accept-language=en&addressdetails=1`;
          
          if (userLocation) {
            nominatimUrl += `&lat=${userLocation.latitude}&lon=${userLocation.longitude}`;
          }

          try {
            const response = await fetch(nominatimUrl);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`[geocodePlaces]   Returned ${data.length} results`);
              
              if (data && data.length > 0) {
                // Find closest result to user location
                if (userLocation) {
                  let minDist = Infinity;
                  for (const res of data) {
                    const dist = Math.sqrt(
                      Math.pow(parseFloat(res.lat) - userLocation.latitude, 2) + 
                      Math.pow(parseFloat(res.lon) - userLocation.longitude, 2)
                    );
                    if (dist < minDist) {
                      minDist = dist;
                      bestNominatimResult = res;
                    }
                  }
                  console.log(`[geocodePlaces]   ✓ Found closest (${(minDist * 111).toFixed(2)} km)`);
                } else {
                  bestNominatimResult = data[0];
                  console.log(`[geocodePlaces]   ✓ Using first result`);
                }
                break;
              }
            }
          } catch (err) {
            console.error(`[geocodePlaces]   ✗ Error:`, err.message);
          }
          
          await sleep(1100);
        }
        
        if (bestNominatimResult) {
          result.latitude = parseFloat(bestNominatimResult.lat);
          result.longitude = parseFloat(bestNominatimResult.lon);
          result.displayName = bestNominatimResult.display_name;
          console.log(`[geocodePlaces] ✓✓✓ Nominatim SUCCESS: ${result.latitude}, ${result.longitude}`);
          foundCoordinates = true;
        }
      }
      
      if (foundCoordinates) {
        console.log(`[geocodePlaces] ✓✓✓ FINAL: "${place.name}" located at ${result.latitude}, ${result.longitude}`);
        geocoded.push(result);
      } else {
        console.warn(`[geocodePlaces] ✗✗✗ FAILED: Could not locate "${place.name}"`);
        geocoded.push(place);
      }

    } catch (err) {
      console.error(`[geocodePlaces] ✗✗✗ EXCEPTION for "${place.name}":`, err);
      geocoded.push(place);
    }
  }

  console.log('\n=================================================');
  const successCount = geocoded.filter(p => p.latitude && p.longitude).length;
  console.log(`[geocodePlaces] ✓ Successfully located ${successCount}/${places.length} places`);
  console.log('[geocodePlaces] Results:', geocoded.map(p => ({
    name: p.name,
    hasCoords: !!(p.latitude && p.longitude),
    lat: p.latitude,
    lon: p.longitude
  })));
  console.log('=================================================\n');
  
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
