import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  X, 
  Navigation, 
  Volume2, 
  VolumeX, 
  Layers, 
  Sliders,
  Flame
} from 'lucide-react';
import { searchLocations } from '../api/geocoding';

export function TopBarSearch({ onOpenDrawer, onOpenDirections, onSelectSearchResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  // Bug #19 fix: clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val || val.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Bug #20 fix: error handling on searchLocations
      try {
        const places = await searchLocations(val);
        setResults(places || []);
        setShowDropdown(true);
      } catch (err) {
        console.warn('[TopBarSearch] Geocoding search failed:', err);
        setResults([]);
      }
    }, 200);
  };

  const handleSelect = (place) => {
    onSelectSearchResult({
      name: place.name,
      fullName: place.fullName,
      coords: [place.lat, place.lon]
    });
    setQuery(place.name);
    setShowDropdown(false);
  };

  const handleDirectionsClick = () => {
    if (query && results.length > 0) {
      const topMatch = results[0];
      onSelectSearchResult({
        name: topMatch.name,
        fullName: topMatch.fullName,
        coords: [topMatch.lat, topMatch.lon]
      });
      onOpenDirections({
        name: topMatch.name,
        coords: [topMatch.lat, topMatch.lon]
      });
    } else {
      onOpenDirections(query ? { name: query } : null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (results.length > 0) {
        handleSelect(results[0]);
      } else if (query.trim().length > 1) {
        onOpenDirections({ name: query.trim() });
      }
    }
  };

  return (
    <div className="gmap-search-bar">
      <button 
        className="search-hamburger-btn" 
        onClick={onOpenDrawer}
        title="Menu"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      <input 
        type="text" 
        className="search-input-consumer"
        placeholder="Search a city, address, or landmark"
        value={query}
        onChange={handleSearchChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
      />

      {query ? (
        <button 
          className="search-icon-btn"
          onClick={() => {
            setQuery('');
            setResults([]);
            setShowDropdown(false);
          }}
          title="Clear search"
        >
          <X size={18} />
        </button>
      ) : (
        <button className="search-icon-btn" title="Search">
          <Search size={18} />
        </button>
      )}

      <div className="search-divider-vertical" />

      {/* Google Maps Blue Directions Button */}
      <button 
        className="search-directions-btn"
        onClick={handleDirectionsClick}
        title="Directions & Safe Navigation"
        aria-label="Directions"
      >
        <Navigation size={18} />
      </button>

      {/* Geocoding Dropdown Suggestions */}
      {showDropdown && results.length > 0 && (
        <div className="consumer-search-dropdown">
          {results.map(r => (
            <div 
              key={r.id} 
              className="consumer-search-item"
              onClick={() => handleSelect(r)}
            >
              <Search size={14} color="#5f6368" style={{ flexShrink: 0 }} />
              <div>
                <div className="consumer-item-title">{r.name}</div>
                <div className="consumer-item-sub">{r.fullName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBarUtilities({
  soundActive,
  onToggleSound,
  onOpenDemoModal,
  legendOpen,
  onToggleLegend,
  hasNearbyHazard,
  nearbyHazardText
}) {
  const [showNearbyBanner, setShowNearbyBanner] = useState(true);

  return (
    <>
      {/* Dismissible Nearby Hazard Notification (Top Center / Near search) */}
      {showNearbyBanner && hasNearbyHazard && (
        <div style={{ position: 'absolute', top: '12px', left: '420px', zIndex: 999, pointerEvents: 'auto' }}>
          <div className="nearby-hazard-banner">
            <Flame size={16} color="#d93025" style={{ flexShrink: 0 }} />
            <span>{nearbyHazardText || 'Active wildfire nearby — Check safe routes'}</span>
            <button 
              className="banner-dismiss-btn"
              onClick={() => setShowNearbyBanner(false)}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Top Right Floating Controls (Demo Mode, Legend, Sound) */}
      <div className="top-right-controls">
        {/* Subtle Demo Mode Pill */}
        <button 
          className="demo-mode-pill"
          onClick={onOpenDemoModal}
          title="Open Demo Mode simulator"
        >
          <Sliders size={14} />
          <span>Demo Mode</span>
        </button>

        {/* Legend Toggle Button */}
        <button 
          className={`utility-round-btn ${legendOpen ? 'active' : ''}`}
          onClick={onToggleLegend}
          title={legendOpen ? "Hide Map Legend" : "Show Map Legend"}
        >
          <Layers size={17} />
        </button>

        {/* Sound Siren Toggle Button */}
        <button 
          className={`utility-round-btn ${soundActive ? 'active' : ''}`}
          onClick={onToggleSound}
          title={soundActive ? "Alert sounds enabled" : "Enable alert sounds"}
        >
          {soundActive ? <Volume2 size={17} color="#1e8e3e" /> : <VolumeX size={17} />}
        </button>
      </div>
    </>
  );
}

export default function TopBar(props) {
  return (
    <>
      {!props.isDirectionsOpen && (
        <TopBarSearch 
          onOpenDrawer={props.onOpenDrawer}
          onOpenDirections={props.onOpenDirections}
          onSelectSearchResult={props.onSelectSearchResult}
        />
      )}
      <TopBarUtilities {...props} />
    </>
  );
}
