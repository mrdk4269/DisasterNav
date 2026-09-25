import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Waves, 
  Activity, 
  Sliders, 
  Plus, 
  Trash2, 
  MapPin, 
  Crosshair
} from 'lucide-react';
import { createDisasterPolygon, getPointAlongRoute } from '../utils/geometry';

export default function DemoModal({
  isOpen,
  onClose,
  mapCenter,
  onInjectDisaster,
  onClearDemoDisasters,
  demoDisastersCount,
  isPlacingOnMap,
  onStartMapPlacement,
  placedCoords,
  activeTrip,
  activeRoute
}) {
  const [type, setType] = useState('fire');
  const [name, setName] = useState('Yamuna Sector Brush Fire');
  const [lat, setLat] = useState(mapCenter ? (mapCenter[0] + 0.04).toFixed(4) : '28.6500');
  const [lon, setLon] = useState(mapCenter ? (mapCenter[1] + 0.03).toFixed(4) : '77.2500');
  const [badgeLabel, setBadgeLabel] = useState('38% Contain');
  const [radiusKm, setRadiusKm] = useState(12.0);
  const [severity, setSeverity] = useState('Urgent');

  useEffect(() => {
    if (placedCoords) {
      setLat(placedCoords[0].toFixed(4));
      setLon(placedCoords[1].toFixed(4));
    }
  }, [placedCoords]);

  if (!isOpen && !isPlacingOnMap) return null;

  // Floating placement banner when clicking on map
  if (isPlacingOnMap) {
    return (
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1050,
        background: '#e8710a',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'var(--font-sans)',
        fontSize: '13.5px',
        fontWeight: '600'
      }}>
        <Crosshair size={18} className="animate-spin" />
        <span>Click anywhere on the map to set disaster location</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'fire') {
      setName('Shivalik Foothills Wildfire');
      setBadgeLabel('25% Contain');
      setRadiusKm(12.0);
    } else if (newType === 'flood') {
      setName('Yamuna Inundation Breach');
      setBadgeLabel('+4.5 ft Crest');
      setRadiusKm(10.0);
    } else if (newType === 'earthquake') {
      setName('Delhi-NCR Fault Tremor M4.4');
      setBadgeLabel('M4.4 Richter');
      setRadiusKm(22.0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const radNum = parseFloat(radiusKm);

    if (isNaN(latNum) || isNaN(lonNum)) return;

    const newDisaster = {
      id: `demo-manual-${Date.now()}`,
      type,
      name,
      badgeLabel,
      latitude: latNum,
      longitude: lonNum,
      impactRadiusKm: radNum,
      severity,
      detectedTime: new Date().toISOString(),
      source: 'Demo Simulator',
      status: 'Live Injected Event',
      isDemo: true,
      polygon: createDisasterPolygon(latNum, lonNum, radNum)
    };

    onInjectDisaster(newDisaster);
    onClose();
  };

  return (
    <div className="demo-modal-overlay">
      <div className="demo-modal-card">
        {/* Clean Header */}
        <div className="demo-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#e8710a" />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#202124' }}>
                Demo Simulator
              </h3>
              <div style={{ fontSize: '11.5px', color: '#5f6368' }}>
                Inject a disaster on the map to test automatic route detours
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="demo-modal-body">
          {/* Hazard Type Selector */}
          <div className="form-group">
            <label className="form-label">Disaster Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`gmap-chip ${type === 'fire' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => handleTypeChange('fire')}
              >
                <Flame size={14} color="#e8710a" />
                <span>Wildfire</span>
              </button>

              <button
                type="button"
                className={`gmap-chip ${type === 'flood' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => handleTypeChange('flood')}
              >
                <Waves size={14} color="#0284c7" />
                <span>Flood</span>
              </button>

              <button
                type="button"
                className={`gmap-chip ${type === 'earthquake' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => handleTypeChange('earthquake')}
              >
                <Activity size={14} color="#d93025" />
                <span>Earthquake</span>
              </button>
            </div>
          </div>

          {/* Hazard Name & Badge */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label className="form-label">Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Status</label>
              <input 
                type="text" 
                className="form-input" 
                value={badgeLabel} 
                onChange={(e) => setBadgeLabel(e.target.value)} 
                placeholder="e.g. 38% Contain"
                required
              />
            </div>
          </div>

          {/* Map Placement Mode Button */}
          <div style={{
            background: '#f8f9fa',
            border: '1px dashed #dadce0',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3c4043' }}>
              <Crosshair size={15} color="#e8710a" />
              <span>Choose position directly on map</span>
            </div>
            <button
              type="button"
              onClick={onStartMapPlacement}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                color: '#202124',
                padding: '5px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <MapPin size={13} color="#ea580c" />
              <span>Click on Map</span>
            </button>
          </div>

          {/* Quick Route Intercept Shortcut for Live Demos */}
          {activeRoute && (
            <div style={{
              background: '#e8f0fe',
              border: '1px solid #c2e7ff',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a73e8' }}>
                  Place along active navigation route
                </div>
                <div style={{ fontSize: '11px', color: '#5f6368' }}>
                  Tests mid-trip hazard detection and automatic detour recalculation
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pt = getPointAlongRoute(activeRoute, 0.45);
                  if (pt) {
                    setLat(pt[0].toFixed(4));
                    setLon(pt[1].toFixed(4));
                  }
                }}
                style={{
                  background: '#1a73e8',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Place on Route
              </button>
            </div>
          )}

          {/* Coordinates */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Latitude</label>
              <input 
                type="number" 
                step="0.0001" 
                className="form-input" 
                value={lat} 
                onChange={(e) => setLat(e.target.value)} 
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Longitude</label>
              <input 
                type="number" 
                step="0.0001" 
                className="form-input" 
                value={lon} 
                onChange={(e) => setLon(e.target.value)} 
                required
              />
            </div>
          </div>

          {/* Severity & Threat Radius */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Threat Level</label>
              <select 
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Radius: {radiusKm} km</label>
              <input 
                type="range" 
                min="2" 
                max="50" 
                step="1"
                value={radiusKm} 
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))} 
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#1a73e8',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              <span>Add Demo Disaster</span>
            </button>

            {demoDisastersCount > 0 && (
              <button
                type="button"
                onClick={onClearDemoDisasters}
                style={{
                  padding: '10px 14px',
                  background: '#fce8e6',
                  color: '#c5221f',
                  border: '1px solid #fad2cf',
                  borderRadius: '20px',
                  fontWeight: '600',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>Clear ({demoDisastersCount})</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
