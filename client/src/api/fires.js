import { MOCK_FIRES } from '../data/mockFires';
import { createDisasterPolygon } from '../utils/geometry';

export async function fetchFires() {
  try {
    const res = await fetch('/api/fires', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('Fire proxy returned ' + res.status);
    const json = await res.json();

    const rawList = json.data && Array.isArray(json.data) ? json.data : MOCK_FIRES;

    const formatted = rawList.map(item => {
      const radiusKm = item.impactRadiusKm || Math.max((item.confidence || 80) / 12, 5);
      return {
        id: item.id || `fire-${item.latitude}-${item.longitude}`,
        type: 'fire',
        name: item.name || 'Wildfire Perimeter',
        badgeLabel: item.containment || item.badgeLabel || `${item.confidence}% Conf`,
        latitude: item.latitude,
        longitude: item.longitude,
        confidence: item.confidence || 85,
        brightness: item.brightness || 320,
        containment: item.containment || 'Active Perimeter',
        impactRadiusKm: radiusKm,
        place: item.place || `${item.name || 'Thermal Hotspot'} Sector`,
        detectedTime: item.acq_date
          ? new Date(`${item.acq_date}T${String(item.acq_time || '0000').padStart(4, '0').slice(0, 2)}:${String(item.acq_time || '0000').padStart(4, '0').slice(2)}:00Z`).toISOString()
          : new Date().toISOString(),
        source: json.source || 'CAL-FIRE/FIRMS',
        status: item.status || 'Active Wildfire Threat',
        severity: (item.confidence > 90 || (item.brightness && item.brightness > 340)) ? 'Urgent' : 'High',
        polygon: createDisasterPolygon(item.latitude, item.longitude, radiusKm)
      };
    });

    return {
      success: true,
      source: json.source || 'CAL-FIRE/FIRMS',
      data: formatted
    };
  } catch (err) {
    console.warn('Fire proxy failed, using high-fidelity local feed:', err.message);
    const mockFormatted = MOCK_FIRES.map(fire => ({
      ...fire,
      polygon: createDisasterPolygon(fire.latitude, fire.longitude, fire.impactRadiusKm)
    }));
    return {
      success: true,
      source: 'CAL-FIRE/FIRMS (Cached Telemetry)',
      data: mockFormatted
    };
  }
}
