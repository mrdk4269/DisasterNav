import { MOCK_FLOODS } from '../data/mockFloods';
import { createDisasterPolygon } from '../utils/geometry';

export async function fetchFloods() {
  try {
    // Inundation zones are modeled from hydro gauges / simulated river net
    const formatted = MOCK_FLOODS.map(flood => ({
      ...flood,
      place: `${flood.name} Basin Inundation Zone`,
      polygon: createDisasterPolygon(flood.latitude, flood.longitude, flood.impactRadiusKm)
    }));

    return {
      success: true,
      source: 'NOAA River Net (Simulated)',
      data: formatted
    };
  } catch (err) {
    console.error('Error loading flood data:', err);
    return {
      success: false,
      source: 'NOAA River Net (Simulated)',
      data: []
    };
  }
}
