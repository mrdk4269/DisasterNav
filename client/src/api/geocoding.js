/**
 * Geocoding and Address Search
 * Multi-tier engine: Instant local dictionary + Backend Photon cache + Direct Photon fallback
 */

export const POPULAR_INDIAN_PLACES = [
  { name: 'Connaught Place, New Delhi', fullName: 'Connaught Place, Central Delhi, Delhi, India', lat: 28.6315, lon: 77.2167 },
  { name: 'New Delhi', fullName: 'New Delhi, Delhi, India', lat: 28.6139, lon: 77.2090 },
  { name: 'Agra (Taj Mahal)', fullName: 'Agra, Uttar Pradesh, India', lat: 27.1767, lon: 78.0081 },
  { name: 'Jaipur (Pink City)', fullName: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873 },
  { name: 'Mumbai', fullName: 'Mumbai, Maharashtra, India', lat: 19.0760, lon: 72.8777 },
  { name: 'Pune', fullName: 'Pune, Maharashtra, India', lat: 18.5204, lon: 73.8567 },
  { name: 'Chandigarh', fullName: 'Chandigarh, Punjab/Haryana, India', lat: 30.7333, lon: 76.7794 },
  { name: 'Dehradun City', fullName: 'Dehradun, Uttarakhand, India', lat: 30.3165, lon: 78.0322 },
  { name: 'Rishikesh Safe Sector', fullName: 'Rishikesh, Uttarakhand, India', lat: 30.0869, lon: 78.2676 },
  { name: 'Haridwar Safe Corridor', fullName: 'Haridwar, Uttarakhand, India', lat: 29.9457, lon: 78.1642 },
  { name: 'Roorkee', fullName: 'Roorkee, Uttarakhand, India', lat: 29.8543, lon: 77.8880 },
  { name: 'Nainital Town', fullName: 'Nainital, Uttarakhand, India', lat: 29.3919, lon: 79.4542 },
  { name: 'Haldwani Safe Relief Hub', fullName: 'Haldwani, Nainital District, Uttarakhand, India', lat: 29.2183, lon: 79.5130 },
  { name: 'Shimla', fullName: 'Shimla, Himachal Pradesh, India', lat: 31.1048, lon: 77.1734 },
  { name: 'Ambala', fullName: 'Ambala, Haryana, India', lat: 30.3782, lon: 76.7767 },
  { name: 'Meerut', fullName: 'Meerut, Uttar Pradesh, India', lat: 28.9845, lon: 77.7064 },
  { name: 'Moradabad', fullName: 'Moradabad, Uttar Pradesh, India', lat: 28.8356, lon: 78.7747 },
  { name: 'Bareilly', fullName: 'Bareilly, Uttar Pradesh, India', lat: 28.3670, lon: 79.4304 },
  { name: 'Lucknow', fullName: 'Lucknow, Uttar Pradesh, India', lat: 26.8467, lon: 80.9462 },
  { name: 'Kanpur', fullName: 'Kanpur, Uttar Pradesh, India', lat: 26.4499, lon: 80.3319 },
  { name: 'Varanasi', fullName: 'Varanasi, Uttar Pradesh, India', lat: 25.3176, lon: 82.9739 },
  { name: 'Prayagraj (Allahabad)', fullName: 'Prayagraj, Uttar Pradesh, India', lat: 25.4358, lon: 81.8463 },
  { name: 'Kolkata', fullName: 'Kolkata, West Bengal, India', lat: 22.5726, lon: 88.3639 },
  { name: 'Bengaluru', fullName: 'Bengaluru, Karnataka, India', lat: 12.9716, lon: 77.5946 },
  { name: 'Chennai', fullName: 'Chennai, Tamil Nadu, India', lat: 13.0827, lon: 80.2707 },
  { name: 'Hyderabad', fullName: 'Hyderabad, Telangana, India', lat: 17.3850, lon: 78.4867 },
  { name: 'Ahmedabad', fullName: 'Ahmedabad, Gujarat, India', lat: 23.0225, lon: 72.5714 },
  { name: 'Surat', fullName: 'Surat, Gujarat, India', lat: 21.1702, lon: 72.8311 },
  { name: 'Bhopal', fullName: 'Bhopal, Madhya Pradesh, India', lat: 23.2599, lon: 77.4126 },
  { name: 'Indore', fullName: 'Indore, Madhya Pradesh, India', lat: 22.7196, lon: 75.8577 },
  { name: 'Gurugram', fullName: 'Gurugram, Haryana, India', lat: 28.4595, lon: 77.0266 },
  { name: 'Noida', fullName: 'Noida, Uttar Pradesh, India', lat: 28.5355, lon: 77.3910 },
  { name: 'Faridabad', fullName: 'Faridabad, Haryana, India', lat: 28.4089, lon: 77.3178 },
  { name: 'Ghaziabad', fullName: 'Ghaziabad, Uttar Pradesh, India', lat: 28.6692, lon: 77.4538 },
  { name: 'Indira Gandhi International Airport', fullName: 'IGI Airport, New Delhi, India', lat: 28.5562, lon: 77.1000 },
  { name: 'AIIMS New Delhi', fullName: 'All India Institute of Medical Sciences, New Delhi', lat: 28.5672, lon: 77.2100 },
  { name: 'Safdarjung Hospital', fullName: 'Safdarjung Hospital & Medical College, New Delhi', lat: 28.5702, lon: 77.2078 },
  { name: 'National Disaster Response Force (NDRF) HQ', fullName: 'NDRF HQ, New Delhi, India', lat: 28.5833, lon: 77.2289 }
];

export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  // 1. Instant local matching
  const localMatches = POPULAR_INDIAN_PLACES.filter(p => 
    p.name.toLowerCase().includes(cleanQuery) || 
    p.fullName.toLowerCase().includes(cleanQuery)
  ).map((p, idx) => ({
    id: `local-${idx}-${p.lat}`,
    name: p.name,
    fullName: p.fullName,
    lat: p.lat,
    lon: p.lon,
    type: 'place'
  }));

  // 2. Query backend geocode proxy
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const serverResults = await res.json();
      if (Array.isArray(serverResults) && serverResults.length > 0) {
        // Merge without duplicates
        const combined = [...localMatches];
        serverResults.forEach(sr => {
          const isDup = combined.some(c => 
            Math.abs(c.lat - sr.lat) < 0.05 && Math.abs(c.lon - sr.lon) < 0.05
          );
          if (!isDup) combined.push(sr);
        });
        return combined.slice(0, 8);
      }
    }
  } catch (backendErr) {
    console.warn('[Geocoding] Backend proxy error, using direct Photon fallback:', backendErr.message);
  }

  // 3. Direct Photon fallback if backend proxy is unavailable
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
    const photonRes = await fetch(photonUrl, { signal: AbortSignal.timeout(3000) });
    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data.features && data.features.length > 0) {
        const photonResults = data.features.map((f, idx) => {
          const p = f.properties || {};
          const name = p.name || p.city || p.state || query;
          const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
          return {
            id: `photon-direct-${idx}`,
            name: name,
            fullName: parts.length > 0 ? parts.join(', ') : name,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            type: p.osm_value || 'place'
          };
        });

        const combined = [...localMatches];
        photonResults.forEach(pr => {
          const isDup = combined.some(c => 
            Math.abs(c.lat - pr.lat) < 0.05 && Math.abs(c.lon - pr.lon) < 0.05
          );
          if (!isDup) combined.push(pr);
        });
        return combined.slice(0, 8);
      }
    }
  } catch (photonErr) {
    console.warn('[Geocoding] Photon direct fallback error:', photonErr.message);
  }

  // Fallback to local matches if remote engines fail
  return localMatches.slice(0, 6);
}

/**
 * Resolves an address or place string directly to [lat, lon] coordinates and display name.
 * Used when a user types a destination and presses Enter or clicks 'Get Directions' without picking from dropdown.
 */
export async function geocodeAddress(query) {
  if (!query || query.trim().length === 0) return null;

  // Check if already contains coordinates like "28.6139, 77.2090"
  const coordMatch = query.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[3]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return {
        name: `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        coords: [lat, lon]
      };
    }
  }

  const results = await searchLocations(query);
  if (results && results.length > 0) {
    return {
      name: results[0].name,
      fullName: results[0].fullName,
      coords: [results[0].lat, results[0].lon]
    };
  }

  return null;
}
