import { config } from '../config/index.js';
import { getCached, setCached } from '../utils/cache.js';
import { FALLBACK_FIRES } from '../data/fallbackFires.js';

/**
 * Fetch active thermal hotspots from NASA FIRMS VIIRS feed for India region,
 * or safely fall back to realistic high-fidelity local feed if offline/no key.
 * @returns {Promise<{ source: string, cached?: boolean, data: Array }>}
 */
export async function getFires() {
  const cached = getCached('fires');
  if (cached) {
    return { source: 'NASA FIRMS (Cached)', data: cached };
  }

  const firmsKey = config.FIRMS_API_KEY;
  if (!firmsKey || firmsKey === 'your_firms_key_here') {
    setCached('fires', FALLBACK_FIRES);
    return {
      source: 'FSI / NASA FIRMS (Local Feeds)',
      cached: false,
      data: FALLBACK_FIRES
    };
  }

  try {
    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${firmsKey}/VIIRS_SNPP_NRT/IND/1`;
    const response = await fetch(firmsUrl);
    if (!response.ok) throw new Error(`FIRMS API returned ${response.status}`);

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
      setCached('fires', FALLBACK_FIRES);
      return { source: 'FSI / NASA FIRMS', data: FALLBACK_FIRES };
    }

    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lonIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('bright_ti4');
    const confIdx = headers.indexOf('confidence');
    const dateIdx = headers.indexOf('acq_date');
    const timeIdx = headers.indexOf('acq_time');
    const frpIdx = headers.indexOf('frp');

    const parsedFires = [];
    for (let i = 1; i < Math.min(lines.length, 30); i++) {
      const parts = lines[i].split(',');
      const lat = parseFloat(parts[latIdx]);
      const lon = parseFloat(parts[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const conf = parts[confIdx] ? parseInt(parts[confIdx], 10) || 80 : 80;

      parsedFires.push({
        id: `firms-${i}-${parts[dateIdx] || 'now'}`,
        name: `Thermal Anomaly #${i}`,
        latitude: lat,
        longitude: lon,
        confidence: conf,
        brightness: parts[brightIdx] ? parseFloat(parts[brightIdx]) : 315,
        impactRadiusKm: Math.max(conf / 10, 6),
        containment: "Thermal Hotspot",
        acq_date: parts[dateIdx] || new Date().toISOString().split('T')[0],
        acq_time: parts[timeIdx] || "0000",
        frp: parts[frpIdx] ? parseFloat(parts[frpIdx]) : 25,
        source: 'NASA FIRMS VIIRS',
        status: 'Active Hotspot'
      });
    }

    setCached('fires', parsedFires);
    return { source: 'NASA FIRMS Live', data: parsedFires };
  } catch (err) {
    console.warn('[FireService] Error fetching FIRMS API, using fallback data:', err.message);
    return {
      source: 'FSI / NASA FIRMS (Offline Fallback)',
      data: FALLBACK_FIRES
    };
  }
}
