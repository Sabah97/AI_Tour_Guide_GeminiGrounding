// Preset locations + custom lat/lng support.
// Add more entries here — name shown in UI, lat/lng forwarded as
// toolConfig.retrievalConfig.latLng to Gemini.

export const PRESET_LOCATIONS = [
  { id: 'none', label: 'No location', latitude: null, longitude: null },
  { id: 'uttara-s4', label: 'Uttara Sector 4, Dhaka', latitude: 23.8759, longitude: 90.3795 },
  { id: 'gulshan-2', label: 'Gulshan 2, Dhaka', latitude: 23.7925, longitude: 90.4078 },
  { id: 'dhanmondi', label: 'Dhanmondi, Dhaka', latitude: 23.7461, longitude: 90.3742 },
  { id: 'mirpur-10', label: 'Mirpur 10, Dhaka', latitude: 23.8069, longitude: 90.3687 },
  { id: 'old-embassy', label: 'San Francisco, CA', latitude: 37.78193, longitude: -122.40476 },
];

export function findPreset(id) {
  return PRESET_LOCATIONS.find((l) => l.id === id) || PRESET_LOCATIONS[0];
}
