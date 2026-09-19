/**
 * Geospatial utility functions for TreeGuard
 * Computes exact straight-line distances using the Haversine formula
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the great-circle distance between two geographic coordinates in meters
 * using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371000; // Earth's mean radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // In meters
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats distance in meters into human-readable text:
 * - Under 1000m: "850 m", "320 m"
 * - 1000m and above: "1.2 km", "2.4 km", "15.7 km"
 */
export function formatDistance(meters: number): string {
  if (meters === undefined || meters === null || isNaN(meters) || meters < 0) {
    return 'Distance unavailable';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const kilometers = meters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)} km`;
  } else {
    return `${kilometers.toFixed(1)} km`;
  }
}

/**
 * Generates external Google Maps direction URL to the exact tree coordinates
 */
export function getDirectionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}
