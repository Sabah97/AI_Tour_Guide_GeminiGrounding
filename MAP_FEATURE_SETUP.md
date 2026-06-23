# Map Feature - Setup & Usage Guide

## 🚀 Installation

### Step 1: Install Dependencies

```bash
cd client
npm install leaflet react-leaflet
cd ..
```

### Step 2: Restart Dev Server

```bash
npm run dev
```

---

## ✅ What Was Added

### New Files Created:

1. **`client/src/components/MapPanel.jsx`**
   - Interactive map component
   - Shows place markers with numbers
   - User location marker
   - Click-to-view place details
   - Minimize/expand/close controls

2. **`client/src/lib/places.js`**
   - Extracts place names from Gemini response
   - Geocodes places to lat/lng coordinates
   - Calculates distances from user location
   - Matches places with Google Maps grounding data

### Modified Files:

1. **`client/src/App.jsx`**
   - Integrated MapPanel component
   - Auto-extracts places from AI responses
   - Manages map visibility and selected place

2. **`client/src/styles.css`**
   - Added custom marker styles
   - Map panel layout
   - Place info panel styling

---

## 🎯 How It Works

### Flow:

```
1. User asks: "Suggest 3 cafes near me for 2 hours"
   ↓
2. Gemini returns grounded response with place names
   ↓
3. System extracts place names from response
   ↓
4. Geocodes each place to get lat/lng
   ↓
5. Map appears on right side with markers
   ↓
6. User clicks marker → See place details
```

### Features:

✅ **Automatic Place Detection**
- Detects places from Markdown headings (`### Place Name`)
- Detects from numbered lists (`1. **Place Name**`)

✅ **Smart Geocoding**
- Uses OpenStreetMap Nominatim (free, no API key)
- Considers user location for better accuracy
- Falls back if location-based search fails

✅ **Distance Calculation**
- Shows distance from user's location
- Displays in meters (<1km) or kilometers

✅ **Interactive Map**
- Numbered markers (1, 2, 3...)
- User location marker (📍)
- Click to see place details
- Auto-fits bounds to show all places

✅ **Place Information Panel**
- Name and description
- Distance from user
- Link to Google Maps
- Based on Gemini's grounded data

---

## 🧪 Testing

### Test Scenario 1: Basic Place Recommendations

1. Click **"Use My Location"**
2. Ask: **"Suggest 3 quiet cafes within 1 km"**
3. Expected:
   - Chat shows 3 cafe recommendations
   - Map appears on right with 3 numbered markers
   - Your location shown with 📍
   - Map auto-fits to show all locations

### Test Scenario 2: Click Place Marker

1. After map appears, **click marker "1"**
2. Expected:
   - Place info panel appears below map header
   - Shows place name and description
   - Shows distance (e.g., "0.5 km")
   - "View on Google Maps" link appears

### Test Scenario 3: Map Controls

1. **Minimize button (⊟)**: Collapses map to smaller size
2. **Expand button (⊞)**: Expands back to normal size
3. **Close button (×)**: Hides map completely
4. New AI response with places: Map reappears automatically

### Test Scenario 4: Different Locations

1. Select **"Uttara Sector 4"** from location chips
2. Ask: **"Recommend 4 historical places for 3 hours"**
3. Expected:
   - Map centers on Uttara
   - 4 places shown with markers
   - Distances calculated from Uttara

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────┐
│                    Header                           │
├───────────────────────────┬─────────────────────────┤
│                           │  Map View         [⊞][×]│
│  Chat Messages            ├─────────────────────────┤
│                           │                         │
│  User: Suggest 3 cafes    │      📍 You             │
│                           │                         │
│  AI: Here are 3 places:   │   1️⃣ Cafe A             │
│  1. Cafe A - 0.3 km       │   2️⃣ Cafe B             │
│  2. Cafe B - 0.7 km       │   3️⃣ Cafe C             │
│  3. Cafe C - 1.2 km       │                         │
│                           │                         │
│                           ├─────────────────────────┤
│                           │ ℹ️ Cafe A (Selected)    │
│                           │ 0.3 km away             │
│                           │ Historic cafe with...   │
│                           │ [View on Google Maps ↗] │
├───────────────────────────┴─────────────────────────┤
│  [Location Chips]                                   │
│  [Message Input]                           [Send]   │
└─────────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Map doesn't appear

**Solution:**
```bash
# Make sure leaflet is installed
cd client
npm install leaflet react-leaflet
npm run dev
```

### Issue: No markers on map

**Cause:** Place names couldn't be geocoded

**Solutions:**
- Use more specific place names
- Include city/area in your question
- Check console for geocoding errors

### Issue: Markers in wrong location

**Cause:** Place name is ambiguous (multiple places with same name)

**Solutions:**
- Use "Use My Location" before asking
- Be more specific (e.g., "Dhaka University" not just "University")
- Include area context in question

### Issue: "Loading places on map..." never finishes

**Cause:** Nominatim API rate limit (max 1 request/second)

**Solutions:**
- Wait a few seconds and try again
- This is normal for 3-4 places (takes 3-4 seconds)

---

## 📱 Responsive Design

- **Desktop (>640px)**: Map appears on right side
- **Mobile (<640px)**: Map appears below chat
- Map height adjusts automatically
- Touch-friendly controls

---

## 🔧 Customization

### Change Map Tiles:

Edit `MapPanel.jsx`:
```javascript
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  // Try alternatives:
  // Dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
  // Satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
/>
```

### Change Marker Colors:

Edit `styles.css`:
```css
.place-pin {
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}
```

### Adjust Place Extraction:

Edit `places.js` → `extractPlaces()` function to match your Gemini response format.

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Map appears automatically after AI suggests places
2. ✅ Numbered markers appear on correct locations
3. ✅ Your location shows with 📍 icon
4. ✅ Clicking markers shows place info panel
5. ✅ "View on Google Maps" links work
6. ✅ Map controls (minimize/close) function
7. ✅ Distances are calculated correctly

---

## 📚 Technical Details

### Libraries Used:

- **Leaflet**: Open-source map library
- **React-Leaflet**: React wrapper for Leaflet
- **Nominatim API**: Free geocoding (OpenStreetMap)

### API Limits:

- Nominatim: 1 request/second (enforced in code)
- No API keys required
- Free for reasonable use

### Data Flow:

```
Gemini Response
    ↓
Extract Place Names (regex parsing)
    ↓
Match with Grounding Data (placeId, URI)
    ↓
Geocode to Lat/Lng (Nominatim API)
    ↓
Calculate Distances (Haversine formula)
    ↓
Render on Map (Leaflet)
```

---

## 🎉 You're Done!

The map feature is now fully integrated. Ask Gemini for place recommendations and watch the magic happen! 🗺️✨
