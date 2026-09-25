import React from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Flame, 
  Waves, 
  Activity, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { calculateDistance } from '../utils/geometry';

export default function AlertSheet({
  disasters,
  userLocation,
  referenceCoords,
  isExpanded,
  onToggleExpand,
  onSelectDisaster
}) {
  const origin = userLocation || referenceCoords || [28.6139, 77.2090];

  const sortedDisasters = [...disasters].map(d => {
    const dist = calculateDistance(origin[0], origin[1], d.latitude, d.longitude);
    return { ...d, distanceKm: dist };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="gmap-bottom-sheet">
      {/* Consumer Bottom Sheet Drag Handle Bar */}
      <div className="sheet-handle-consumer" onClick={onToggleExpand}>
        <div className="sheet-drag-pill" />
        
        <div className="sheet-header-row">
          <div className="sheet-title-text">
            <AlertTriangle size={17} color="#e8710a" />
            <span>Active alerts near you</span>
            <span className="sheet-badge-count">{sortedDisasters.length}</span>
          </div>

          <div className="sheet-updated-text">
            <span>Updated 2 min ago</span>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Alert List */}
      {isExpanded && (
        <div className="sheet-alerts-grid">
          {sortedDisasters.map(d => {
            let IconComp = Flame;
            let iconBg = '#feefe3';
            let iconColor = '#e8710a';

            if (d.type === 'flood') {
              IconComp = Waves;
              iconBg = '#e0f2fe';
              iconColor = '#0284c7';
            } else if (d.type === 'earthquake') {
              IconComp = Activity;
              iconBg = '#fce8e6';
              iconColor = '#d93025';
            }

            const distStr = d.distanceKm < 1 
              ? `${(d.distanceKm * 1000).toFixed(0)} m away`
              : `${d.distanceKm.toFixed(1)} km away`;

            return (
              <div 
                key={d.id} 
                className="consumer-alert-card"
                onClick={() => onSelectDisaster(d)}
              >
                <div className="alert-circle-icon" style={{ background: iconBg, color: iconColor }}>
                  <IconComp size={18} />
                </div>

                <div className="alert-card-text">
                  <div className="alert-card-row-1">
                    <span className="alert-card-place">{d.name}</span>
                    <span className="alert-card-dist">{distStr}</span>
                  </div>

                  <div className="alert-card-row-2">
                    <span style={{ fontWeight: 600, color: iconColor }}>
                      {d.badgeLabel || d.status}
                    </span>
                    <span> • </span>
                    <span>{d.place || 'Hazard zone'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
