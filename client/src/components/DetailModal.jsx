import React from 'react';
import { X, Flame, Waves, Activity, Navigation, ShieldCheck, MapPin } from 'lucide-react';

// Pre-defined regional emergency safe evacuation zones
const SAFE_EVACUATION_ZONES = [
  { name: 'Haridwar Safe Relief Corridor', coords: [29.9457, 78.1642] },
  { name: 'Roorkee Emergency Relief Center', coords: [29.8543, 77.8880] },
  { name: 'Haldwani Safe Relief Hub', coords: [29.2183, 79.5130] },
  { name: 'New Delhi Safe Emergency Center', coords: [28.6315, 77.2167] },
  { name: 'Pune Civil Hospital Safe Zone', coords: [18.5204, 73.8567] },
  { name: 'Chandigarh Emergency Relief Hub', coords: [30.7333, 76.7794] }
];

export default function DetailModal({ disaster, onClose, onEvacuate, onRouteAround }) {
  if (!disaster) return null;

  const type = disaster.type || 'fire';
  let IconComp = Flame;
  let themeColor = '#e8710a';
  let themeBg = '#feefe3';

  if (type === 'flood') {
    IconComp = Waves;
    themeColor = '#0284c7';
    themeBg = '#e0f2fe';
  } else if (type === 'earthquake') {
    IconComp = Activity;
    themeColor = '#d93025';
    themeBg = '#fce8e6';
  }

  const latStr = `${Math.abs(disaster.latitude).toFixed(4)}° ${disaster.latitude >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(disaster.longitude).toFixed(4)}° ${disaster.longitude >= 0 ? 'E' : 'W'}`;
  const radiusKm = Number(disaster.impactRadiusKm) || 5;

  // Find nearest safe evacuation zone that is outside this disaster perimeter
  const getNearestSafeZone = () => {
    let best = null;
    let minDist = Infinity;

    SAFE_EVACUATION_ZONES.forEach(zone => {
      const dLat = (zone.coords[0] - disaster.latitude) * 111;
      const dLon = (zone.coords[1] - disaster.longitude) * 111 * Math.cos(disaster.latitude * Math.PI / 180);
      const distKm = Math.sqrt(dLat * dLat + dLon * dLon);

      // Must be at least 1.5x the hazard radius away to be completely outside
      if (distKm > radiusKm * 1.5 && distKm < minDist) {
        minDist = distKm;
        best = { ...zone, distanceKm: distKm.toFixed(1) };
      }
    });

    if (!best) {
      // Fallback: point 25km south outside the perimeter
      const safeLat = disaster.latitude - (radiusKm * 1.8 / 111);
      const safeLon = disaster.longitude;
      best = {
        name: `Safe Relief Staging Area (${radiusKm + 10}km away)`,
        coords: [safeLat, safeLon],
        distanceKm: (radiusKm + 10).toFixed(1)
      };
    }

    return best;
  };

  const safeZone = getNearestSafeZone();

  const handleEvacuateClick = () => {
    if (onEvacuate) {
      onEvacuate({
        destinationName: safeZone.name,
        destinationCoords: safeZone.coords,
        originName: `${disaster.name} Vicinity`,
        originCoords: [disaster.latitude, disaster.longitude]
      });
    } else if (onRouteAround) {
      onRouteAround({
        name: safeZone.name,
        latitude: safeZone.coords[0],
        longitude: safeZone.coords[1]
      });
    }
  };

  const handlePerimeterRouteClick = () => {
    // Route to safe outer staging area outside the buffer
    const angle = Math.PI / 4;
    const offsetDeg = (radiusKm * 1.3) / 111;
    const perimeterCoords = [
      disaster.latitude + offsetDeg * Math.sin(angle),
      disaster.longitude + offsetDeg * Math.cos(angle)
    ];

    if (onEvacuate) {
      onEvacuate({
        destinationName: `${disaster.name} (Safe Outer Staging)`,
        destinationCoords: perimeterCoords
      });
    } else if (onRouteAround) {
      onRouteAround({
        name: `${disaster.name} (Safe Outer Staging)`,
        latitude: perimeterCoords[0],
        longitude: perimeterCoords[1]
      });
    }
  };

  return (
    <div className="detail-modal-overlay">
      <div className="detail-modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: themeBg,
            color: themeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <IconComp size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#202124' }}>
              {disaster.name}
            </div>
            <div style={{ fontSize: '11px', color: themeColor, fontWeight: '600' }}>
              {disaster.badgeLabel || disaster.status}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', padding: '4px' }}
          title="Close details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="detail-modal-body">
        <div className="detail-stat-row">
          <span className="detail-stat-label">Source Attribution</span>
          <span className="detail-stat-val" style={{ color: themeColor }}>{disaster.source}</span>
        </div>

        <div className="detail-stat-row">
          <span className="detail-stat-label">Incident Type</span>
          <span className="detail-stat-val" style={{ textTransform: 'capitalize' }}>{disaster.type}</span>
        </div>

        <div className="detail-stat-row">
          <span className="detail-stat-label">Coordinates</span>
          <span className="detail-stat-val">{latStr}, {lonStr}</span>
        </div>

        <div className="detail-stat-row">
          <span className="detail-stat-label">Hazard Perimeter</span>
          <span className="detail-stat-val" style={{ color: '#d93025', fontWeight: '700' }}>
            {radiusKm.toFixed(1)} km radius (Danger Zone)
          </span>
        </div>

        {/* Primary Action: Evacuate to Nearest Safe Zone */}
        <button
          onClick={handleEvacuateClick}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '10px 14px',
            background: '#1e8e3e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '12.5px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(30, 142, 62, 0.4)'
          }}
        >
          <ShieldCheck size={16} />
          <span>Evacuate to {safeZone.name.split(',')[0]} ({safeZone.distanceKm} km away)</span>
        </button>

        {/* Secondary Action: Approach Outer Perimeter Safely */}
        <button
          onClick={handlePerimeterRouteClick}
          style={{
            marginTop: '6px',
            width: '100%',
            padding: '8px 12px',
            background: '#ffffff',
            color: '#1a73e8',
            border: '1px solid #dadce0',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Navigation size={14} />
          <span>Navigate to Outer Safe Staging</span>
        </button>
      </div>
    </div>
  );
}
