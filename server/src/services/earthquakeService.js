import { getCached, setCached } from '../utils/cache.js';

const USGS_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

/**
 * Fetch and parse real-time global earthquake feeds from USGS ShakeNet.
 * Uses 5-minute caching to minimize upstream load.
 * @returns {Promise<{ source: string, data: Array }>}
 */
export async function getEarthquakes() {
  const cached = getCached('earthquakes');
  if (cached) {
    return { source: 'USGS (Cached)', data: cached };
  }

  try {
    const response = await fetch(USGS_FEED_URL);
    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);
    const data = await response.json();

    const earthquakes = (data.features || []).map(f => {
      const mag = f.properties.mag || 0;
      return {
        id: f.id,
        name: f.properties.place || 'Unknown Location',
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        magnitude: mag,
        badgeLabel: `M${mag.toFixed(1)} Richter`,
        time: f.properties.time,
        source: 'USGS ShakeNet',
        status: mag >= 4.5 ? 'Significant Tremor' : 'Minor Seismic Event',
        impactRadiusKm: Math.max(mag * 3.5, 4)
      };
    });

    setCached('earthquakes', earthquakes);
    return { source: 'USGS Real-time', data: earthquakes };
  } catch (err) {
    console.warn('[EarthquakeService] USGS feed error, using fallback:', err.message);
    return { source: 'USGS (Offline Fallback)', data: [] };
  }
}
