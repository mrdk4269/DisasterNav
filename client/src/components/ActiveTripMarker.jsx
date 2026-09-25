import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

function createVehicleIcon(isHazardWarning) {
  const color = isHazardWarning ? '#d93025' : '#1e8e3e';
  const label = isHazardWarning ? 'Detour Active' : 'Navigating';
  const wrapperClass = isHazardWarning ? 'trip-vehicle-icon-wrapper hazard-warning' : 'trip-vehicle-icon-wrapper';
  const labelClass = isHazardWarning ? 'trip-vehicle-label hazard-warning' : 'trip-vehicle-label';

  const html = `
    <div class="trip-vehicle-marker">
      <div class="${wrapperClass}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      </div>
      <div class="${labelClass}">${label}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-trip-vehicle-icon',
    iconSize: [80, 50],
    iconAnchor: [40, 20]
  });
}

const normalVehicleIcon = createVehicleIcon(false);
const warningVehicleIcon = createVehicleIcon(true);

export default function ActiveTripMarker({ location, isHazardWarning }) {
  if (!location || location.length < 2 || location[0] == null || location[1] == null || isNaN(location[0]) || isNaN(location[1])) return null;

  return (
    <Marker 
      position={location}
      icon={isHazardWarning ? warningVehicleIcon : normalVehicleIcon}
      zIndexOffset={1100}
    />
  );
}
