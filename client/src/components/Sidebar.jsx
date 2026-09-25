import React from 'react';
import { 
  ShieldAlert, 
  Map as MapIcon, 
  AlertTriangle, 
  Navigation, 
  BarChart3, 
  Sliders, 
  X,
  Radio,
  ExternalLink,
  Info
} from 'lucide-react';

export default function Sidebar({ 
  isOpen, 
  onClose,
  disastersCount, 
  onOpenDirections,
  onOpenDemoModal,
  onExpandAlerts
}) {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="gmap-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Brand Header */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <div className="drawer-logo">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="drawer-title">DisasterGuard</div>
              <div className="drawer-subtitle">Safe Navigation & Crisis Alerts</div>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="drawer-nav">
          <button 
            className="drawer-item active"
            onClick={onClose}
          >
            <MapIcon size={18} color="#1a73e8" />
            <span>Explore Map</span>
          </button>

          <button 
            className="drawer-item"
            onClick={() => {
              onClose();
              onOpenDirections();
            }}
          >
            <Navigation size={18} color="#1a73e8" />
            <span>Directions & Safe Corridors</span>
          </button>

          <button 
            className="drawer-item"
            onClick={() => {
              onClose();
              onExpandAlerts();
            }}
          >
            <AlertTriangle size={18} color="#ea580c" />
            <span>Active Incidents</span>
            {disastersCount > 0 && (
              <span className="drawer-badge">{disastersCount}</span>
            )}
          </button>

          <button 
            className="drawer-item"
            onClick={() => {
              onClose();
              onOpenDemoModal();
            }}
          >
            <Sliders size={18} color="#5f6368" />
            <span>Demo Mode & Simulator</span>
          </button>

          <div className="drawer-divider" />
          <div className="drawer-section-title">Telemetry & Feeds</div>

          <button 
            className="drawer-item"
            onClick={() => {
              alert('Live telemetry: Connected to USGS Earthquake Catalog, NASA FIRMS Thermal Sensor, and Global Flood Monitoring Feeds.');
            }}
          >
            <BarChart3 size={18} color="#5f6368" />
            <span>Data Feeds Status</span>
          </button>

          <div className="drawer-item" style={{ cursor: 'default' }}>
            <Radio size={18} color="#1e8e3e" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Live Sensor Sync</span>
              <span style={{ fontSize: '11px', color: '#1e8e3e' }}>All systems connected</span>
            </div>
          </div>
        </nav>

        {/* Consumer Clean Footer */}
        <div className="drawer-footer">
          <div style={{ fontWeight: '600', color: '#202124' }}>DisasterGuard v2.0</div>
          <div>Public Safety & Disaster Evacuation System</div>
        </div>
      </div>
    </div>
  );
}
