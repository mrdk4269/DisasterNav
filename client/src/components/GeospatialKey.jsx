import React from 'react';
import { X, Flame, Waves, Activity, Navigation, CheckCircle2 } from 'lucide-react';

export default function GeospatialKey({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="gmap-legend-card">
      <div className="legend-header">
        <span className="legend-title">Map Legend</span>
        <button 
          onClick={onClose} 
          style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', padding: '2px' }}
          title="Close legend"
        >
          <X size={15} />
        </button>
      </div>

      <div className="legend-list">
        <div className="legend-item">
          <div className="legend-symbol">
            <Activity size={15} color="#d93025" />
          </div>
          <span>Earthquake</span>
        </div>

        <div className="legend-item">
          <div className="legend-symbol">
            <Flame size={15} color="#e8710a" />
          </div>
          <span>Wildfire</span>
        </div>

        <div className="legend-item">
          <div className="legend-symbol">
            <Waves size={15} color="#0284c7" />
          </div>
          <span>Flood Area</span>
        </div>

        <div className="legend-item">
          <div className="legend-symbol">
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#1a73e8',
              border: '2px solid #ffffff',
              boxShadow: '0 0 4px #1a73e8'
            }} />
          </div>
          <span>Your Location</span>
        </div>

        <div className="legend-item">
          <div className="legend-symbol">
            <div style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              background: '#1e8e3e'
            }} />
          </div>
          <span>Safe Route</span>
        </div>
      </div>
    </div>
  );
}
