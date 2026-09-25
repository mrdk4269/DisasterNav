import React, { useEffect } from 'react';
import { X, Eye, Flame, Waves, Activity } from 'lucide-react';

export default function ToastNotification({ toast, onClose, onView }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const { disaster, message, distanceKm } = toast;
  const type = disaster?.type || 'fire';

  let IconComp = Flame;
  let iconBg = '#feefe3';
  let iconColor = '#e8710a';
  let typeLabel = 'Wildfire';

  if (type === 'flood') {
    IconComp = Waves;
    iconBg = '#e0f2fe';
    iconColor = '#0284c7';
    typeLabel = 'Flood Area';
  } else if (type === 'earthquake') {
    IconComp = Activity;
    iconBg = '#fce8e6';
    iconColor = '#d93025';
    typeLabel = 'Earthquake';
  }

  const titleText = message || `New ${typeLabel} detected near you`;
  const distText = distanceKm !== undefined && distanceKm !== null 
    ? `${distanceKm.toFixed(1)} km away` 
    : (disaster?.place || disaster?.badgeLabel || 'Active zone');

  return (
    <div style={{
      position: 'absolute',
      top: '70px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1060,
      background: '#ffffff',
      border: '1px solid #dadce0',
      borderLeft: `4px solid ${iconColor}`,
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '360px',
      maxWidth: '92vw',
      animation: 'slideDown 0.25s ease-out'
    }}>
      <div style={{
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <IconComp size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#202124' }}>
          {titleText}
        </div>
        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{disaster?.name || 'Incident Area'}</span>
          <span>•</span>
          <span style={{ color: iconColor, fontWeight: '600' }}>{distText}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {disaster && (
          <button
            onClick={() => {
              onView(disaster);
              onClose();
            }}
            style={{
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Eye size={13} />
            <span>View</span>
          </button>
        )}

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#80868b', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
