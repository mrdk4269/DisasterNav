import React from 'react';
import { Polyline, Polygon, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

function createOriginIcon() {
  return L.divIcon({
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="width:14px; height:14px; background:#ffffff; border:3px solid #1a73e8; border-radius:50%; box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    className: 'custom-endpoint-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function createDestinationIcon() {
  return L.divIcon({
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#d93025" stroke="#ffffff" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    className: 'custom-endpoint-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 22]
  });
}

const originMarkerIcon = createOriginIcon();
const destMarkerIcon = createDestinationIcon();

export default function RouteLayer({ 
  routeGeoJSON, 
  safeRouteGeoJSON, 
  warningRouteGeoJSON,
  isHazardous, 
  isVerifiedSafe,
  avoidPolygonDebug
}) {
  if (!routeGeoJSON) return null;

  const extractLatLngs = (geojson) => {
    if (!geojson) return [];
    try {
      if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
        return geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
      } else if (geojson.type === 'Feature') {
        return geojson.geometry.coordinates.map(c => [c[1], c[0]]);
      } else if (geojson.type === 'LineString') {
        return geojson.coordinates.map(c => [c[1], c[0]]);
      }
    } catch (e) {
      console.warn('Error extracting latlngs:', e);
    }
    return [];
  };

  const primaryCoords = extractLatLngs(routeGeoJSON);
  const safeCoords = extractLatLngs(safeRouteGeoJSON);
  const warningCoords = extractLatLngs(warningRouteGeoJSON) || primaryCoords;

  if (primaryCoords.length === 0) return null;

  const startPoint = primaryCoords[0];
  const endPoint = primaryCoords[primaryCoords.length - 1];

  // Helper to extract polygon latLngs from GeoJSON Polygon / MultiPolygon for debug rendering
  const extractPolygonLatLngs = (polyGeoJSON) => {
    if (!polyGeoJSON) return [];
    try {
      if (polyGeoJSON.type === 'Polygon' && Array.isArray(polyGeoJSON.coordinates)) {
        return polyGeoJSON.coordinates.map(ring => ring.map(c => [c[1], c[0]]));
      } else if (polyGeoJSON.type === 'MultiPolygon' && Array.isArray(polyGeoJSON.coordinates)) {
        return polyGeoJSON.coordinates.flatMap(polygonRings => 
          polygonRings.map(ring => ring.map(c => [c[1], c[0]]))
        );
      }
    } catch (err) {
      console.warn('Error extracting debug polygon latlngs:', err);
    }
    return [];
  };

  const debugPolygonRings = extractPolygonLatLngs(avoidPolygonDebug);

  return (
    <>
      {/* Requirement 4: Visible Debug / Verification Indicator for exact avoid_polygon sent to ORS */}
      {debugPolygonRings.length > 0 && debugPolygonRings.map((ring, idx) => (
        <Polygon
          key={`debug-avoid-${idx}`}
          positions={ring}
          pathOptions={{
            color: '#7c3aed',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#7c3aed',
            fillOpacity: 0.06
          }}
        >
          <Tooltip sticky>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6d28d9' }}>
              🔍 Avoidance Geometry Sent to ORS
            </div>
          </Tooltip>
        </Polygon>
      ))}

      {/* Case 1: Hazardous AND Post-Check Verified Safe Detour (Zero intersections) */}
      {isHazardous && isVerifiedSafe && safeCoords.length > 0 ? (
        <>
          {/* Hazardous Original Path in dashed red/gray */}
          <Polyline
            positions={primaryCoords}
            pathOptions={{
              color: '#d93025',
              weight: 4,
              dashArray: '6, 8',
              opacity: 0.5
            }}
          />

          {/* Verified Safe Detour in solid Google Green */}
          <Polyline
            positions={safeCoords}
            pathOptions={{
              color: '#1e8e3e',
              weight: 6,
              opacity: 0.95
            }}
          />

          {/* Soft Green Glow */}
          <Polyline
            positions={safeCoords}
            pathOptions={{
              color: '#34a853',
              weight: 12,
              opacity: 0.2
            }}
          />
        </>
      ) : isHazardous && !isVerifiedSafe ? (
        /* Case 2: Hazardous AND Could NOT Fully Avoid (Route still passes near or through hazard) */
        /* NEVER GREEN! MUST BE RENDERED IN WARNING RED/AMBER */
        <>
          <Polyline
            positions={warningCoords.length > 0 ? warningCoords : primaryCoords}
            pathOptions={{
              color: '#d93025',
              weight: 6,
              opacity: 0.95
            }}
          />
          {/* Alarming Red Alert Glow */}
          <Polyline
            positions={warningCoords.length > 0 ? warningCoords : primaryCoords}
            pathOptions={{
              color: '#ea4335',
              weight: 14,
              opacity: 0.35
            }}
          />
        </>
      ) : (
        /* Case 3: Completely Clear Baseline Path (Google Blue) */
        <>
          <Polyline
            positions={primaryCoords}
            pathOptions={{
              color: '#1a73e8',
              weight: 6,
              opacity: 0.95
            }}
          />
        </>
      )}

      {/* Start and Destination Markers */}
      <Marker position={startPoint} icon={originMarkerIcon} />
      <Marker position={endPoint} icon={destMarkerIcon} />
    </>
  );
}
