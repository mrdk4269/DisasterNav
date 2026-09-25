import React from 'react';
import { 
  Navigation, 
  Play, 
  Pause, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  X,
  Compass
} from 'lucide-react';

export default function ActiveTripHUD({
  isActive,
  destinationName,
  distanceRemainingKm,
  isRerouting,
  midTripAlert,
  isVerifiedSafe,
  isHazardous,
  onEndTrip,
  isSimulating,
  onToggleSimulate
}) {
  if (!isActive) return null;

  const etaMinutes = (distanceRemainingKm !== null && distanceRemainingKm !== undefined)
    ? (distanceRemainingKm <= 0 ? 0 : Math.max(1, Math.round((distanceRemainingKm / 60) * 60)))
    : 15;

  // Determine the correct status label based on actual verification state
  let statusLabel;
  if (midTripAlert) {
    statusLabel = 'Detour around hazard';
  } else if (isHazardous && isVerifiedSafe) {
    statusLabel = 'Route avoids hazard zone';
  } else if (isHazardous && !isVerifiedSafe) {
    statusLabel = '⚠️ Route near hazard — proceed with caution';
  } else {
    statusLabel = 'Route clear';
  }

  return (
    <div className={`gmap-nav-banner ${midTripAlert ? 'has-hazard' : ''} ${isHazardous && !isVerifiedSafe ? 'has-hazard' : ''}`}>
      {/* Navigation Direction Arrow Icon */}
      <div className="nav-banner-icon">
        <Navigation size={22} />
      </div>

      {/* Turn-by-Turn Guidance Info */}
      <div className="nav-banner-info">
        <div className="nav-banner-dest">
          {destinationName || 'Destination'}
        </div>
        <div className="nav-banner-meta">
          <span>{distanceRemainingKm !== null && distanceRemainingKm !== undefined ? `${distanceRemainingKm.toFixed(1)} km` : '-- km'}</span>
          <span>•</span>
          <span>{etaMinutes} min</span>
          <span>•</span>
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="nav-banner-actions">
        {/* Drive Simulation Button (for judges/demo) */}
        <button 
          className="nav-sim-btn"
          onClick={onToggleSimulate}
          title="Simulate driving motion along the route"
        >
          {isSimulating ? <Pause size={13} /> : <Play size={13} />}
          <span>{isSimulating ? 'Pause' : 'Simulate'}</span>
        </button>

        {/* Exit Navigation Button */}
        <button 
          className="nav-exit-btn"
          onClick={onEndTrip}
          title="Exit navigation"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
