import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import DisasterCycleLayer from './DisasterCycleLayer';
import UserLocationMarker from './UserLocationMarker';
import ActiveTripMarker from './ActiveTripMarker';
import RouteLayer from './RouteLayer';
import { Plus, Minus, Crosshair, Layers } from 'lucide-react';

// Controller component to smoothly fly/pan ONLY on explicit user trigger
function MapController({ flyTarget }) {
  const map = useMap();
  const lastTargetRef = useRef(0);

  useEffect(() => {
    if (flyTarget && flyTarget.coords && flyTarget.timestamp !== lastTargetRef.current) {
      lastTargetRef.current = flyTarget.timestamp;
      map.flyTo(flyTarget.coords, flyTarget.zoom || map.getZoom(), {
        animate: true,
        duration: 1.0
      });
    }
  }, [flyTarget, map]);

  return null;
}

// Map event listener for panning coordinates and click-to-place demo hazard
function MapEvents({ onCenterChange, isPlacingOnMap, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    const handleMove = () => {
      const c = map.getCenter();
      onCenterChange([c.lat, c.lng]);
    };

    const handleClick = (e) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    };

    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);
    map.on('click', handleClick);

    if (isPlacingOnMap) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
      map.off('click', handleClick);
      map.getContainer().style.cursor = '';
    };
  }, [map, onCenterChange, isPlacingOnMap, onMapClick]);

  return null;
}

// Basemap layer options (100% free, NO API KEY REQUIRED, NO WATERMARK)
const BASEMAP_TILES = {
  osm: {
    name: 'Default',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  esri_gray: {
    name: 'Clean Light',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 16
  },
  esri_topo: {
    name: 'Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Topo',
    maxZoom: 18
  }
};

// Google Maps Standard Controls Cluster (Bottom Right)
function GoogleMapsControls({ onRecenter }) {
  const map = useMap();

  return (
    <div className="gmap-bottom-right-cluster">
      {/* Locate Me (Recenter) Button */}
      <button 
        className="gmap-locate-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRecenter();
        }}
        title="Your location"
        aria-label="Recenter map to user location"
      >
        <Crosshair size={20} />
      </button>

      {/* Stacked Zoom Controls (+ / -) */}
      <div className="gmap-zoom-pill">
        <button
          className="zoom-btn"
          onClick={(e) => {
            e.stopPropagation();
            map.zoomIn();
          }}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus size={18} />
        </button>

        <div className="zoom-divider" />

        <button
          className="zoom-btn"
          onClick={(e) => {
            e.stopPropagation();
            map.zoomOut();
          }}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}

// Google Maps Bottom-Left "Layers" Button
function LayersThumbnailButton({ currentTile, onToggleTile }) {
  return (
    <button 
      className="gmap-layers-thumbnail-btn"
      onClick={onToggleTile}
      title={`Current basemap: ${BASEMAP_TILES[currentTile].name}. Click to switch style.`}
      aria-label="Toggle map layers"
    >
      <div className="layers-label">
        <Layers size={12} />
        <span>Layers</span>
      </div>
    </button>
  );
}

export default function MapView({
  disasters,
  activeFilter,
  userLocation,
  isGpsActive,
  initialCenter = [28.6139, 77.2090],
  initialZoom = 6,
  flyTarget,
  onCenterChange,
  onSelectDisaster,
  routeGeoJSON,
  safeRouteGeoJSON,
  warningRouteGeoJSON,
  isHazardous,
  isVerifiedSafe,
  avoidPolygonDebug,
  onRecenter,
  isPlacingOnMap,
  onMapClick,
  activeTrip,
  liveTripLocation
}) {
  const [tileKey, setTileKey] = useState('osm');

  const handleToggleTile = () => {
    const keys = Object.keys(BASEMAP_TILES);
    const nextIdx = (keys.indexOf(tileKey) + 1) % keys.length;
    setTileKey(keys[nextIdx]);
  };

  const currentBasemap = BASEMAP_TILES[tileKey];

  // Filter disasters according to activeFilter chip
  const filteredDisasters = disasters.filter(d => {
    if (activeFilter === 'all') return true;
    return d.type === activeFilter;
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        minZoom={2}
        maxZoom={19}
        maxBounds={[[-85.0511, -180], [85.0511, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={tileKey}
          attribution={currentBasemap.attribution}
          url={currentBasemap.url}
          maxZoom={currentBasemap.maxZoom}
          noWrap={true}
          bounds={[[-85.0511, -180], [85.0511, 180]]}
        />

        <MapController flyTarget={flyTarget} />
        <MapEvents 
          onCenterChange={onCenterChange} 
          isPlacingOnMap={isPlacingOnMap} 
          onMapClick={onMapClick} 
        />

        {/* Disaster Pins Layer */}
        <DisasterCycleLayer
          disasters={filteredDisasters}
          onSelectDisaster={onSelectDisaster}
        />

        {/* User Location Marker (Google Maps Blue Dot) */}
        {!activeTrip && (
          <UserLocationMarker
            location={userLocation}
            isGpsActive={isGpsActive}
          />
        )}

        {/* Active Trip Guidance Vehicle Marker */}
        {activeTrip && (
          <ActiveTripMarker
            location={liveTripLocation}
            isHazardWarning={isHazardous}
          />
        )}

        {/* Route & Safe Corridor Layer with Post-Check Verification */}
        <RouteLayer
          routeGeoJSON={routeGeoJSON}
          safeRouteGeoJSON={safeRouteGeoJSON}
          warningRouteGeoJSON={warningRouteGeoJSON}
          isHazardous={isHazardous}
          isVerifiedSafe={isVerifiedSafe}
          avoidPolygonDebug={avoidPolygonDebug}
        />

        {/* Google Maps Bottom-Right Controls (+ / -, Locate me) */}
        <GoogleMapsControls onRecenter={onRecenter} />

        {/* Google Maps Bottom-Left Layers Button */}
        <LayersThumbnailButton currentTile={tileKey} onToggleTile={handleToggleTile} />
      </MapContainer>
    </div>
  );
}
