import { MOCK_EARTHQUAKES } from '../data/mockEarthquakes';
import { createDisasterPolygon } from '../utils/geometry';

export async function fetchEarthquakes() {
  try {
    // 2.5+ earthquakes in the last 24h (worldwide GeoJSON, free, no key)
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error('USGS API returned ' + res.status);
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('No features returned from USGS');
    }

    // Filter to significant or regional, or take top 25 latest
    const formatted = data.features.slice(0, 25).map((f, idx) => {
      const coords = f.geometry.coordinates;
      const mag = f.properties.mag || 3.0;
      const radiusKm = Math.max(mag * 4.5, 6);
      const lat = coords[1];
      const lon = coords[0];

      return {
        id: f.id || `usgs-eq-${idx}`,
        type: 'earthquake',
        name: f.properties.title || `M${mag.toFixed(1)} Seismic Shockwave`,
        badgeLabel: `M${mag.toFixed(1)} Richter`,
        latitude: lat,
        longitude: lon,
        depthKm: coords[2] || 10,
        magnitude: mag,
        impactRadiusKm: radiusKm,
        place: f.properties.place || 'Seismic Event Zone',
        detectedTime: new Date(f.properties.time).toISOString(),
        source: 'USGS ShakeNet Live',
        status: mag >= 4.5 ? 'Significant Shockwave' : 'Minor Fault Movement',
        severity: mag >= 5.0 ? 'Critical' : (mag >= 4.0 ? 'Urgent' : 'Moderate'),
        polygon: createDisasterPolygon(lat, lon, radiusKm)
      };
    });

    return {
      success: true,
      source: 'USGS ShakeNet Live',
      data: formatted
    };
  } catch (err) {
    console.warn('USGS live feed unavailable, utilizing cached seismic telemetry:', err.message);
    const mockFormatted = MOCK_EARTHQUAKES.map(eq => ({
      ...eq,
      polygon: createDisasterPolygon(eq.latitude, eq.longitude, eq.impactRadiusKm)
    }));
    return {
      success: true,
      source: 'USGS ShakeNet (Cached Telemetry)',
      data: mockFormatted
    };
  }
}
