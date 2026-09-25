import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

function createUserDivIcon() {
  const html = `
    <div class="user-location-marker">
      <div class="user-location-dot"></div>
      <div class="user-location-label">You</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

const userIcon = createUserDivIcon();

export default function UserLocationMarker({ location, isGpsActive }) {
  if (!isGpsActive || !location || location.length < 2 || location[0] == null || location[1] == null || isNaN(location[0]) || isNaN(location[1])) {
    return null;
  }

  return (
    <Marker 
      position={location}
      icon={userIcon}
      zIndexOffset={1000}
    />
  );
}
