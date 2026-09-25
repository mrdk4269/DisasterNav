import React from 'react';
import { Route as RouteIcon, Flame, Waves, Activity, X } from 'lucide-react';

export default function FilterChips({
  activeFilter,
  setActiveFilter,
  counts,
  routeActive,
  onClearRoute
}) {
  return (
    <div className="gmap-filter-chips-row">
      <button 
        type="button"
        className={`gmap-chip ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => setActiveFilter('all')}
      >
        <span className="gmap-chip-dot all"></span>
        <span>All ({counts.total})</span>
      </button>

      <button 
        type="button"
        className={`gmap-chip ${activeFilter === 'fire' ? 'active' : ''}`}
        onClick={() => setActiveFilter(activeFilter === 'fire' ? 'all' : 'fire')}
      >
        <Flame size={14} color="#e8710a" />
        <span>Wildfires ({counts.fires})</span>
      </button>

      <button 
        type="button"
        className={`gmap-chip ${activeFilter === 'flood' ? 'active' : ''}`}
        onClick={() => setActiveFilter(activeFilter === 'flood' ? 'all' : 'flood')}
      >
        <Waves size={14} color="#0284c7" />
        <span>Flood Areas ({counts.floods})</span>
      </button>

      <button 
        type="button"
        className={`gmap-chip ${activeFilter === 'earthquake' ? 'active' : ''}`}
        onClick={() => setActiveFilter(activeFilter === 'earthquake' ? 'all' : 'earthquake')}
      >
        <Activity size={14} color="#d93025" />
        <span>Earthquakes ({counts.earthquakes})</span>
      </button>

      {routeActive && (
        <button 
          type="button"
          className="gmap-chip active"
          onClick={onClearRoute}
          title="Click to clear route"
        >
          <RouteIcon size={14} color="#1e8e3e" />
          <span>Route: Active</span>
          <X size={13} style={{ marginLeft: 2 }} />
        </button>
      )}
    </div>
  );
}
