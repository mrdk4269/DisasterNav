import React, { useId } from 'react';

/**
 * DisasterNav Modern Brand Logo Component
 * Combines navigation delta vector with hazard detection radar arcs and dual-tone safety/alert gradients.
 */
export default function DisasterNavLogo({ size = 36, showText = false, subtitle = null, className = '' }) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div className={`disasternav-brand-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block', borderRadius: `${Math.round(size * 0.25)}px` }}
      >
        <defs>
          <linearGradient id={`bgGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b1329" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id={`navBlue-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id={`navOrange-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          <linearGradient id={`pulseGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
          </linearGradient>

          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle container with soft glowing neon border */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill={`url(#bgGrad-${id})`}
          stroke="#38bdf8"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />

        {/* Hazard detection radar rings */}
        <path
          d="M 12 36 A 20 20 0 0 1 52 36"
          fill="none"
          stroke={`url(#pulseGrad-${id})`}
          strokeWidth="1.8"
          strokeDasharray="3 3"
          opacity="0.65"
        />
        <path
          d="M 18 36 A 14 14 0 0 1 46 36"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.4"
        />

        {/* Origami 3D Navigation Arrow Vector */}
        <g filter={`url(#glow-${id})`}>
          {/* Safe Corridor Navigation Wing */}
          <polygon points="32,10 16,46 32,38" fill={`url(#navBlue-${id})`} />
          {/* Hazard Avoidance Alert Wing */}
          <polygon points="32,10 32,38 48,46" fill={`url(#navOrange-${id})`} />
          {/* Center Spine Crease */}
          <line x1="32" y1="10" x2="32" y2="38" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        </g>

        {/* Navigation Beacon Summit Pin */}
        <circle cx="32" cy="10" r="2.5" fill="#ffffff" />
        <circle cx="32" cy="10" r="5" fill="#38bdf8" opacity="0.4" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <div style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.02em', color: '#202124' }}>
            <span>Disaster</span>
            <span style={{ color: '#1a73e8' }}>Nav</span>
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: '#5f6368', fontWeight: '500', marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
