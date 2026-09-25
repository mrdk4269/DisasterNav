import React, { useState, useEffect } from 'react';
import { 
  X, 
  Navigation, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ArrowUpDown, 
  Car, 
  Bike, 
  Bus, 
  Footprints, 
  Compass, 
  RotateCcw,
  ShieldCheck, 
  Search, 
  ShieldAlert
} from 'lucide-react';
import { searchLocations, geocodeAddress } from '../api/geocoding';
import { getRoute } from '../api/routing';
import { checkRouteIntersections, verifyRouteAgainstHazards } from '../utils/geometry';

export default function NavDrawer({
  isOpen,
  onClose,
  userLocation,
  isGpsActive,
  disasters,
  initialDestination,
  onRouteCalculated,
  onClearRoute,
  activeTrip,
  onStartTrip,
  onEndTrip
}) {
  const [originText, setOriginText] = useState(
    initialDestination?.originName || (isGpsActive && userLocation ? 'Your location' : 'Connaught Place, New Delhi')
  );
  const [originCoords, setOriginCoords] = useState(
    initialDestination?.originCoords || (isGpsActive && userLocation ? userLocation : [28.6315, 77.2167])
  );
  const [originSuggestions, setOriginSuggestions] = useState([]);

  // Default destination is empty or initialDestination, never a random hazard!
  const [destText, setDestText] = useState(initialDestination?.name || '');
  const [destCoords, setDestCoords] = useState(initialDestination?.coords || null);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const [travelMode, setTravelMode] = useState('driving');
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState(null);

  // Sync GPS origin if active
  useEffect(() => {
    if (isGpsActive && userLocation && !initialDestination?.originCoords) {
      setOriginCoords(userLocation);
      setOriginText('Your location');
    }
  }, [isGpsActive, userLocation, initialDestination]);

  // Sync initial destination if passed from search bar, card, or evacuation button
  useEffect(() => {
    if (initialDestination) {
      if (initialDestination.name) setDestText(initialDestination.name);
      if (initialDestination.coords) setDestCoords(initialDestination.coords);
      if (initialDestination.originName) setOriginText(initialDestination.originName);
      if (initialDestination.originCoords) setOriginCoords(initialDestination.originCoords);
      setRouteResult(null);
    }
  }, [initialDestination]);

  if (!isOpen) return null;

  // Preset quick destinations for easy demoing (Indian regional routes)
  const demoDestinations = [
    { name: 'Agra (Taj Corridor)', coords: [27.1767, 78.0081], isSafe: true },
    { name: 'Jaipur Express', coords: [26.9124, 75.7873], isSafe: true },
    { name: 'Chandigarh Safe City', coords: [30.7333, 76.7794], isSafe: true },
    { name: 'Rishikesh to Roorkee (Avoidance)', coords: [29.8543, 77.8880], originCoords: [30.0869, 78.2676], originName: 'Rishikesh Vicinity', isSafe: true },
    { name: 'Shivalik Hills (Near Wildfire)', coords: [30.2240, 78.0850], isSafe: false }
  ];

  const handleOriginSearch = async (val) => {
    setOriginText(val);
    if (!val || val.length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const places = await searchLocations(val);
    setOriginSuggestions(places);
  };

  const handleSelectOriginSuggestion = (place) => {
    setOriginText(place.name);
    setOriginCoords([place.lat, place.lon]);
    setOriginSuggestions([]);
  };

  const handleDestSearch = async (val) => {
    setDestText(val);
    if (!val || val.length < 2) {
      setDestSuggestions([]);
      return;
    }
    const places = await searchLocations(val);
    setDestSuggestions(places);
  };

  const handleSelectDestSuggestion = (place) => {
    setDestText(place.name);
    setDestCoords([place.lat, place.lon]);
    setDestSuggestions([]);
  };

  const handleUseGpsOrigin = () => {
    if (userLocation) {
      setOriginCoords(userLocation);
      setOriginText('Your location');
    } else {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const c = [pos.coords.latitude, pos.coords.longitude];
          setOriginCoords(c);
          setOriginText('Your location');
        },
        err => alert('GPS location not available: ' + err.message)
      );
    }
  };

  const handleSwapLocations = () => {
    const tempText = originText;
    const tempCoords = originCoords;
    setOriginText(destText);
    setOriginCoords(destCoords);
    setDestText(tempText);
    setDestCoords(tempCoords);
    setRouteResult(null);
  };

  const handleSelectDemoRoute = (d) => {
    setDestText(d.name);
    setDestCoords(d.coords);
    if (d.originCoords) {
      setOriginCoords(d.originCoords);
      setOriginText(d.originName || 'Starting Point');
    }
    setRouteResult(null);
  };

  // Safe navigation calculation with mandatory POST-VERIFICATION & on-the-fly Geocoding
  const handleCalculateRoute = async () => {
    setIsCalculating(true);
    setRouteResult(null);

    let fromCoords = originCoords;
    let toCoords = destCoords;

    // 1. Resolve origin if missing or typed
    if (!fromCoords && originText && originText.trim().length > 0) {
      if (originText === 'Your location' && userLocation) {
        fromCoords = userLocation;
        setOriginCoords(userLocation);
      } else {
        const resolved = await geocodeAddress(originText);
        if (resolved) {
          fromCoords = resolved.coords;
          setOriginCoords(resolved.coords);
        }
      }
    }

    // 2. Resolve destination if missing or typed
    if (!toCoords && destText && destText.trim().length > 0) {
      const resolved = await geocodeAddress(destText);
      if (resolved) {
        toCoords = resolved.coords;
        setDestCoords(resolved.coords);
        setDestText(resolved.name || destText);
      }
    }

    if (!fromCoords || !toCoords) {
      setIsCalculating(false);
      setRouteResult({ 
        error: !toCoords 
          ? 'Please enter or select a destination (e.g. Agra, Jaipur, or choose from below).' 
          : 'Please select a valid starting point.' 
      });
      return;
    }

    try {
      // 1. Calculate primary baseline route
      const initialRoute = await getRoute(fromCoords, toCoords);
      if (!initialRoute.success || !initialRoute.routeGeoJSON) {
        setRouteResult({
          error: initialRoute.error || 'Could not find a driving route between these points. Please check the locations.'
        });
        setIsCalculating(false);
        return;
      }

      // 2. Initial hazard check against active disaster perimeters
      const initialCheck = checkRouteIntersections(initialRoute.routeGeoJSON, disasters);

      let safeRoute = null;
      let returnedDetourRoute = null;
      let rerouted = false;
      let isVerifiedSafe = false;
      let postCheckResult = null;

      // 3. If intersected, call routing engine with avoid_polygons
      if (initialCheck.hasHazard && initialCheck.avoidPolygon) {
        console.log('[NavDrawer] Initial route intersects hazards:', initialCheck.intersectedDisasters.map(d => d.name));
        console.log('[NavDrawer] Sending avoid_polygons to routing API:', initialCheck.avoidPolygon);

        const avoidanceCall = await getRoute(fromCoords, toCoords, initialCheck.avoidPolygon);

        if (avoidanceCall.success && avoidanceCall.routeGeoJSON) {
          returnedDetourRoute = avoidanceCall.routeGeoJSON;

          // Log full ORS/routing response for debugging (Requirement 3)
          console.log('[NavDrawer] Full routing response provider:', avoidanceCall.provider);
          console.log('[NavDrawer] Routing response avoided flag:', avoidanceCall.avoided);

          // 4. CRITICAL POST-VERIFICATION (Requirement 2):
          // NEVER TRUST THE API RESPONSE BLINDLY!
          // Use dedicated verifyRouteAgainstHazards to run the exact same
          // intersection check on the returned route against ALL disasters.
          const verification = verifyRouteAgainstHazards(returnedDetourRoute, disasters);
          console.log('[NavDrawer] Post-verification result:', verification);

          if (verification.isVerifiedSafe) {
            // VERIFIED SAFE: Zero intersection confirmed by Turf!
            console.log('[NavDrawer] ✅ Post-check PASSED: Zero hazard intersections confirmed!');
            safeRoute = returnedDetourRoute;
            rerouted = true;
            isVerifiedSafe = true;
          } else {
            // STILL INTERSECTS: Road network constraints or destination within hazard perimeter!
            console.warn('[NavDrawer] ⚠️ Post-check FAILED: Detour route still passes through hazard zone:', verification.hazardNames);
            rerouted = false;
            isVerifiedSafe = false;
            safeRoute = null; // Do NOT mark as safeRoute!
          }
        }
      } else {
        // Zero hazards on baseline route
        isVerifiedSafe = true;
      }

      const result = {
        hasHazard: initialCheck.hasHazard,
        intersectedDisasters: initialCheck.intersectedDisasters,
        rerouted,
        isVerifiedSafe,
        postCheckResult,
        initialRoute: initialRoute.routeGeoJSON,
        safeRoute: safeRoute,
        returnedDetourRoute: returnedDetourRoute,
        avoidPolygonDebug: initialCheck.avoidPolygon
      };

      setRouteResult(result);

      // Notify parent to render route layers and focus map
      onRouteCalculated({
        primaryRoute: initialRoute.routeGeoJSON,
        safeRoute: safeRoute,
        warningRoute: !isVerifiedSafe && initialCheck.hasHazard ? (returnedDetourRoute || initialRoute.routeGeoJSON) : null,
        isHazardous: initialCheck.hasHazard,
        isVerifiedSafe: isVerifiedSafe,
        avoidPolygonDebug: initialCheck.avoidPolygon,
        intersectedDisasters: initialCheck.intersectedDisasters,
        startCoords: fromCoords,
        endCoords: toCoords
      });

    } catch (err) {
      console.error('Route calculation error:', err);
      setRouteResult({ error: 'Navigation error: ' + err.message });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="gmap-directions-card">
      {/* Travel Modes Bar (Google Maps Header Pattern) */}
      <div className="directions-mode-bar">
        <div className="mode-icon-group">
          <button 
            className={`mode-tab-btn ${travelMode === 'driving' ? 'active' : ''}`}
            onClick={() => setTravelMode('driving')}
            title="Driving"
          >
            <Car size={18} />
          </button>

          <button 
            className={`mode-tab-btn ${travelMode === 'two_wheeler' ? 'active' : ''}`}
            onClick={() => setTravelMode('two_wheeler')}
            title="Two-wheeler"
          >
            <Bike size={18} />
          </button>

          <button 
            className={`mode-tab-btn ${travelMode === 'transit' ? 'active' : ''}`}
            onClick={() => setTravelMode('transit')}
            title="Transit"
          >
            <Bus size={18} />
          </button>

          <button 
            className={`mode-tab-btn ${travelMode === 'walking' ? 'active' : ''}`}
            onClick={() => setTravelMode('walking')}
            title="Walking"
          >
            <Footprints size={18} />
          </button>
        </div>

        {/* Close Button to return to simple search */}
        <button className="directions-close-btn" onClick={onClose} title="Close directions">
          <X size={20} />
        </button>
      </div>

      {/* Origin & Destination Inputs with Visual Dot Connector */}
      <div className="directions-inputs-container">
        {/* Connector Column */}
        <div className="route-dot-connector">
          <div className="dot-origin" />
          <div className="connector-line">
            <span className="connector-dot" />
            <span className="connector-dot" />
            <span className="connector-dot" />
          </div>
          <MapPin size={16} className="dot-destination" />
        </div>

        {/* Input Fields Column */}
        <div className="route-inputs-col">
          {/* Starting point input */}
          <div className="route-field-wrapper" style={{ position: 'relative' }}>
            <input 
              type="text"
              className="route-text-input"
              value={originText}
              onChange={(e) => handleOriginSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCalculateRoute();
              }}
              placeholder="Choose starting point..."
            />
            {originText && originText !== 'Your location' && (
              <button 
                type="button" 
                onClick={() => {
                  setOriginText('');
                  setOriginCoords(null);
                  setOriginSuggestions([]);
                }}
                style={{
                  position: 'absolute',
                  right: originText !== 'Your location' ? '54px' : '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#5f6368',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title="Clear origin"
              >
                <X size={14} />
              </button>
            )}
            {originText !== 'Your location' && (
              <button 
                type="button" 
                className="use-gps-chip-btn"
                onClick={handleUseGpsOrigin}
                title="Use current GPS location"
              >
                <Compass size={12} />
                <span>GPS</span>
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions for Origin */}
          {originSuggestions.length > 0 && (
            <div className="consumer-search-dropdown" style={{ top: '42px' }}>
              {originSuggestions.map(s => (
                <div 
                  key={s.id}
                  className="consumer-search-item"
                  onClick={() => handleSelectOriginSuggestion(s)}
                >
                  <Search size={14} color="#5f6368" style={{ flexShrink: 0 }} />
                  <div>
                    <div className="consumer-item-title">{s.name}</div>
                    <div className="consumer-item-sub">{s.fullName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Destination input */}
          <div className="route-field-wrapper" style={{ position: 'relative' }}>
            <input 
              type="text"
              className="route-text-input"
              value={destText}
              onChange={(e) => handleDestSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCalculateRoute();
              }}
              placeholder="Enter destination (e.g. Agra, Jaipur)..."
            />
            {destText && (
              <button 
                type="button" 
                onClick={() => {
                  setDestText('');
                  setDestCoords(null);
                  setDestSuggestions([]);
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#5f6368',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title="Clear destination"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions for Destination */}
          {destSuggestions.length > 0 && (
            <div className="consumer-search-dropdown" style={{ top: '88px' }}>
              {destSuggestions.map(s => (
                <div 
                  key={s.id}
                  className="consumer-search-item"
                  onClick={() => handleSelectDestSuggestion(s)}
                >
                  <Search size={14} color="#5f6368" style={{ flexShrink: 0 }} />
                  <div>
                    <div className="consumer-item-title">{s.name}</div>
                    <div className="consumer-item-sub">{s.fullName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Origin / Destination Button */}
        <button 
          className="swap-route-btn" 
          onClick={handleSwapLocations}
          title="Reverse starting point and destination"
        >
          <ArrowUpDown size={18} />
        </button>
      </div>

      {/* Body / Actions */}
      <div className="directions-body-content">
        {/* Quick Demo Destinations */}
        <div>
          <div className="quick-targets-label">Quick Demo Destinations:</div>
          <div className="quick-targets-row">
            {demoDestinations.map(d => (
              <button
                key={d.name}
                type="button"
                className={`quick-target-pill ${destText === d.name ? 'active' : ''}`}
                onClick={() => handleSelectDemoRoute(d)}
                style={{
                  borderColor: d.isSafe ? '#ceead6' : '#fad2cf',
                  color: d.isSafe ? '#137333' : '#b06000'
                }}
              >
                {d.isSafe ? '🟢 ' : '⚠️ '}{d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Route Action */}
        <button 
          className="gmap-calc-route-btn"
          onClick={handleCalculateRoute}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying road safety...</span>
            </>
          ) : (
            <>
              <Navigation size={16} />
              <span>Get Directions</span>
            </>
          )}
        </button>

        {/* Route Evaluation Results */}
        {routeResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {routeResult.error ? (
              <div className="consumer-status-box error">
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>{routeResult.error}</div>
              </div>
            ) : !routeResult.hasHazard ? (
              /* Case 1: Route is 100% clear of all hazards */
              <div className="consumer-status-box safe">
                <CheckCircle2 size={18} color="#1e8e3e" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Route looks clear</strong>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    Zero active disaster perimeters detected along this travel corridor. Displayed in blue.
                  </div>
                </div>
              </div>
            ) : routeResult.isVerifiedSafe ? (
              /* Case 2: Hazard was present, and post-check CONFIRMED complete avoidance! */
              <div className="consumer-status-box safe">
                <ShieldCheck size={18} color="#1e8e3e" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Route recalculated to avoid {routeResult.intersectedDisasters.map(d => d.name).join(', ')}</strong>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    Post-verification confirmed zero hazard intersections along this corridor. Displayed in green.
                  </div>
                </div>
              </div>
            ) : (
              /* Case 3: Could NOT fully avoid hazard zone! (Post-check detected route still crosses hazard) */
              <div className="consumer-status-box warning" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
                <ShieldAlert size={18} color="#d93025" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Could not fully avoid the hazard zone</strong>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    Route still passes near {routeResult.intersectedDisasters.map(d => d.name).join(', ')}. Road network constraints prevent complete bypass. Proceed with extreme caution.
                  </div>
                </div>
              </div>
            )}

            {/* Start Navigation or End Navigation */}
            {!activeTrip ? (
              <button
                type="button"
                className="gmap-start-nav-btn"
                style={{
                  background: routeResult.isVerifiedSafe ? '#1e8e3e' : '#d93025'
                }}
                onClick={() => {
                  onStartTrip({
                    route: routeResult.safeRoute || routeResult.returnedDetourRoute || routeResult.initialRoute,
                    destinationName: destText,
                    destinationCoords: destCoords,
                    originCoords: originCoords,
                    isVerifiedSafe: routeResult.isVerifiedSafe
                  });
                }}
              >
                <Navigation size={17} />
                <span>{routeResult.isVerifiedSafe ? 'Start Navigation' : 'Proceed with Caution'}</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onEndTrip}
                  style={{
                    flex: 1,
                    background: '#fce8e6',
                    color: '#c5221f',
                    border: '1px solid #fad2cf',
                    borderRadius: '20px',
                    padding: '8px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  End Navigation
                </button>
              </div>
            )}

            {/* Clear Route Button */}
            <button
              type="button"
              onClick={() => {
                setRouteResult(null);
                onClearRoute();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#5f6368',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '4px'
              }}
            >
              <RotateCcw size={13} />
              <span>Clear route</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
