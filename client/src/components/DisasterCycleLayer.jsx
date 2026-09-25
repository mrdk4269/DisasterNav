import React from 'react';
import { Circle, Marker } from 'react-leaflet';
import L from 'leaflet';

/**
 * Creates clean Google Maps consumer hazard pin icons:
 * - Circular icon with disaster symbol
 * - Soft clean place label underneath
 */
function createConsumerMarkerIcon(disaster) {
  const type = disaster.type || 'fire';
  const nameText = disaster.name || 'Hazard Zone';

  let iconSvg = '';
  if (type === 'fire') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>`;
  } else if (type === 'flood') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`;
  } else {
    // earthquake
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  }

  const iconClass = `cycle-icon-center cycle-icon-${type}`;

  const html = `
    <div class="disaster-cycle-marker">
      <div class="${iconClass}">
        ${iconSvg}
      </div>
      <div class="cycle-label-name">${nameText}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cycle-div-icon',
    iconSize: [100, 56],
    iconAnchor: [50, 16]
  });
}

export default function DisasterCycleLayer({ disasters, onSelectDisaster }) {
  if (!disasters || disasters.length === 0) return null;

  return (
    <>
      {disasters.map(d => {
        const center = [d.latitude, d.longitude];
        const radiusMeters = (d.impactRadiusKm || 5) * 1000;
        const type = d.type || 'fire';

        // Google Maps Crisis Layer styling
        let strokeColor = '#e8710a'; // warm orange
        let fillColor = '#e8710a';

        if (type === 'flood') {
          strokeColor = '#0284c7'; // soft blue
          fillColor = '#0284c7';
        } else if (type === 'earthquake') {
          strokeColor = '#d93025'; // red
          fillColor = '#d93025';
        }

        const icon = createConsumerMarkerIcon(d);

        return (
          <React.Fragment key={d.id}>
            {/* Outer Subtle Threat Boundary Zone */}
            <Circle
              center={center}
              radius={radiusMeters}
              pathOptions={{
                color: strokeColor,
                weight: 1.5,
                fillColor: fillColor,
                fillOpacity: 0.08,
                dashArray: '4, 6'
              }}
              eventHandlers={{ click: () => onSelectDisaster(d) }}
            />

            {/* Inner Core Threat Zone */}
            <Circle
              center={center}
              radius={radiusMeters * 0.45}
              pathOptions={{
                color: strokeColor,
                weight: 2,
                fillColor: fillColor,
                fillOpacity: 0.15
              }}
              eventHandlers={{ click: () => onSelectDisaster(d) }}
            />

            {/* Central Pin Marker */}
            <Marker
              position={center}
              icon={icon}
              eventHandlers={{ click: () => onSelectDisaster(d) }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
