import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import { TopBarSearch, TopBarUtilities } from './components/TopBar';
import FilterChips from './components/FilterChips';
import MapView from './components/MapView';
import GeospatialKey from './components/GeospatialKey';
import AlertSheet from './components/AlertSheet';
import DetailModal from './components/DetailModal';
import NavDrawer from './components/NavDrawer';
import DemoModal from './components/DemoModal';
import ToastNotification from './components/ToastNotification';
import ActiveTripHUD from './components/ActiveTripHUD';

import { fetchEarthquakes } from './api/earthquakes';
import { fetchFires } from './api/fires';
import { fetchFloods } from './api/floods';
import { setSoundEnabled, playAlertSound } from './utils/audio';
import { getRoute } from './api/routing';
import { 
  calculateDistance, 
  checkRouteIntersections, 
  verifyRouteAgainstHazards,
  calculateRemainingRoute, 
  isOffRoute, 
  getRouteLengthKm 
} from './utils/geometry';

export default function App() {
  // Navigation / Consumer UI State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [legendOpen, setLegendOpen] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [toast, setToast] = useState(null);
  const [soundActive, setSoundActiveState] = useState(false);

  // Admin / Demo Placement on Map State
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [placedCoords, setPlacedCoords] = useState(null);
  const alertRadiusKm = 25;

  // Map & Location State (Default: New Delhi / National Hub, India)
  const [telemetryCoords, setTelemetryCoords] = useState([28.6139, 77.2090]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isGpsActive, setIsGpsActive] = useState(false);

  // Disasters State
  const [liveDisasters, setLiveDisasters] = useState([]);
  const [demoDisasters, setDemoDisasters] = useState([]);
  const knownIdsRef = useRef(new Set());

  // Routing State (Planning Phase)
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [safeRouteGeoJSON, setSafeRouteGeoJSON] = useState(null);
  const [warningRouteGeoJSON, setWarningRouteGeoJSON] = useState(null);
  const [isHazardous, setIsHazardous] = useState(false);
  const [isVerifiedSafe, setIsVerifiedSafe] = useState(false);
  const [avoidPolygonDebug, setAvoidPolygonDebug] = useState(null);
  const [navTargetDestination, setNavTargetDestination] = useState(null);

  // Active Trip Guidance State (Active Trip Phase)
  const [activeTrip, setActiveTrip] = useState(false);
  const [tripData, setTripData] = useState(null);
  const [liveTripLocation, setLiveTripLocation] = useState(null);
  const [remainingRouteGeoJSON, setRemainingRouteGeoJSON] = useState(null);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState(null);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [midTripAlert, setMidTripAlert] = useState(null);
  const [isReroutingMidTrip, setIsReroutingMidTrip] = useState(false);
  const watchIdRef = useRef(null);
  const simIndexRef = useRef(0);

  // Refs for values used inside loadDisasterData & handlePositionTick to avoid dependency churn (Bug #3 & #4)
  const telemetryCoordsRef = useRef(telemetryCoords);
  const userLocationRef = useRef(userLocation);
  const activeTripRef = useRef(activeTrip);
  const remainingRouteRef = useRef(remainingRouteGeoJSON);
  const liveTripLocationRef = useRef(liveTripLocation);
  const tripDataRef = useRef(tripData);
  const checkAndHandleMidTripHazardRef = useRef(null);

  // 1. Geolocation Check
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setIsGpsActive(true);
        },
        (error) => {
          console.log('GPS inactive or denied. User marker will NOT be displayed.', error.message);
          setIsGpsActive(false);
          setUserLocation(null);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setIsGpsActive(false);
      setUserLocation(null);
    }

    return () => {
      if (watchIdRef.current && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => { telemetryCoordsRef.current = telemetryCoords; }, [telemetryCoords]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { activeTripRef.current = activeTrip; }, [activeTrip]);
  useEffect(() => { remainingRouteRef.current = remainingRouteGeoJSON; }, [remainingRouteGeoJSON]);
  useEffect(() => { liveTripLocationRef.current = liveTripLocation; }, [liveTripLocation]);
  useEffect(() => { tripDataRef.current = tripData; }, [tripData]);

  // Combined disasters list (Live feeds + Manual demo injections)
  const allDisasters = [...liveDisasters, ...demoDisasters];

  // Helper to extract coordinates list from GeoJSON
  const extractCoordsFromGeoJSON = useCallback((geojson) => {
    if (!geojson) return [];
    try {
      if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
        return geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
      } else if (geojson.type === 'Feature') {
        return geojson.geometry.coordinates.map(c => [c[1], c[0]]);
      } else if (geojson.type === 'LineString') {
        return geojson.coordinates.map(c => [c[1], c[0]]);
      }
    } catch (e) {}
    return [];
  }, []);

  // Mid-Route Hazard Intercept & Automatic Detour Handler with MANDATORY POST-VERIFICATION
  const checkAndHandleMidTripHazard = useCallback(async (routeToCheck, disastersPool, currentCoords) => {
    if (!routeToCheck || !tripData) return;

    const hazardCheck = checkRouteIntersections(routeToCheck, disastersPool);
    if (hazardCheck.hasHazard && hazardCheck.avoidPolygon) {
      const threat = hazardCheck.intersectedDisasters[0];
      playAlertSound('critical');
      setMidTripAlert({
        disaster: threat,
        message: `Hazard ahead near ${threat.name}`
      });
      setToast({
        disaster: threat,
        message: `Hazard ahead near ${threat.name}. Recalculating detour...`
      });

      setIsReroutingMidTrip(true);
      try {
        const fromCoords = currentCoords || liveTripLocation || tripData.originCoords;
        const avoidRes = await getRoute(fromCoords, tripData.destinationCoords, hazardCheck.avoidPolygon);

        if (avoidRes.success && avoidRes.routeGeoJSON) {
          // POST-CHECK on newly returned route using dedicated verification!
          const verification = verifyRouteAgainstHazards(avoidRes.routeGeoJSON, disastersPool);

          if (verification.isVerifiedSafe) {
            // VERIFIED SAFE
            setRouteGeoJSON(tripData.fullRoute);
            setSafeRouteGeoJSON(avoidRes.routeGeoJSON);
            setWarningRouteGeoJSON(null);
            setIsHazardous(true);
            setIsVerifiedSafe(true);

            setTripData(prev => ({ ...prev, fullRoute: avoidRes.routeGeoJSON }));
            setRemainingRouteGeoJSON(avoidRes.routeGeoJSON);
            setDistanceRemainingKm(getRouteLengthKm(avoidRes.routeGeoJSON));
            simIndexRef.current = 0;

            setToast({
              message: `Route updated to avoid ${threat.name} — Post-verification confirmed zero intersections.`
            });
          } else {
            // FAILED POST-CHECK: Road constraints force route near hazard!
            console.warn('[Mid-Trip Detour] Could not fully avoid hazard:', verification.hazardNames);
            setRouteGeoJSON(tripData.fullRoute);
            setSafeRouteGeoJSON(null); // Never mark safe
            setWarningRouteGeoJSON(avoidRes.routeGeoJSON);
            setIsHazardous(true);
            setIsVerifiedSafe(false);

            setToast({
              message: `⚠️ Route passes near ${threat.name} — Road network constraints prevent complete bypass. Proceed with caution.`
            });
          }
        } else {
          setIsHazardous(true);
          setIsVerifiedSafe(false);
          setToast({
            message: `Hazard ahead near ${threat.name}. Proceed with caution.`
          });
        }
      } catch (err) {
        console.error('Mid-trip detour calculation failed:', err);
      } finally {
        setIsReroutingMidTrip(false);
      }
    }
  }, [tripData, liveTripLocation]);

  // Keep hazard handler ref in sync
  useEffect(() => { checkAndHandleMidTripHazardRef.current = checkAndHandleMidTripHazard; }, [checkAndHandleMidTripHazard]);

  // Position tick handler (Bug #4 fix: side effects moved out of state updater)
  const handlePositionTick = useCallback((coords) => {
    setLiveTripLocation(coords);

    const currentTrip = tripDataRef.current;
    if (!currentTrip?.fullRoute) return;

    const sliced = calculateRemainingRoute(currentTrip.fullRoute, coords);
    setRemainingRouteGeoJSON(sliced);
    setDistanceRemainingKm(getRouteLengthKm(sliced));

    if (isOffRoute(currentTrip.fullRoute, coords, 0.8)) {
      getRoute(coords, currentTrip.destinationCoords).then(reRoute => {
        if (reRoute.success && reRoute.routeGeoJSON) {
          setRouteGeoJSON(reRoute.routeGeoJSON);
          setSafeRouteGeoJSON(null);
          setRemainingRouteGeoJSON(reRoute.routeGeoJSON);
          setDistanceRemainingKm(getRouteLengthKm(reRoute.routeGeoJSON));
        }
      });
    }
  }, []);

  // 2. Fetch and merge all disaster feeds (Bug #3 fix: reads volatile state from refs to prevent re-fetch loops)
  const loadDisasterData = useCallback(async () => {
    try {
      const [eqRes, fireRes, floodRes] = await Promise.all([
        fetchEarthquakes(),
        fetchFires(),
        fetchFloods()
      ]);

      const merged = [
        ...(eqRes.data || []),
        ...(fireRes.data || []),
        ...(floodRes.data || [])
      ];

      merged.forEach(d => {
        if (!knownIdsRef.current.has(d.id) && knownIdsRef.current.size > 0) {
          const origin = userLocationRef.current || telemetryCoordsRef.current;
          const dist = calculateDistance(origin[0], origin[1], d.latitude, d.longitude);

          if (dist <= alertRadiusKm) {
            setToast({
              disaster: d,
              message: `New ${d.type} detected nearby`,
              distanceKm: dist
            });
            playAlertSound('critical');
          }
        }
        knownIdsRef.current.add(d.id);
      });

      setLiveDisasters(merged);

      if (activeTripRef.current && remainingRouteRef.current) {
        checkAndHandleMidTripHazardRef.current?.(remainingRouteRef.current, merged, liveTripLocationRef.current);
      }
    } catch (err) {
      console.error('Failed to load disaster feeds:', err);
    }
  }, [alertRadiusKm]);

  useEffect(() => {
    loadDisasterData();
    const pollInterval = setInterval(loadDisasterData, 30000);
    return () => clearInterval(pollInterval);
  }, [loadDisasterData]);

  // Disaster counts
  const counts = {
    total: allDisasters.length,
    earthquakes: allDisasters.filter(d => d.type === 'earthquake').length,
    fires: allDisasters.filter(d => d.type === 'fire').length,
    floods: allDisasters.filter(d => d.type === 'flood').length
  };

  // Check if any wildfire is nearby to show gentle dismissible banner
  const activeFires = allDisasters.filter(d => d.type === 'fire');
  const hasNearbyFire = activeFires.length > 0;
  const nearestFire = activeFires[0];
  const nearbyFireText = nearestFire ? `🔥 Active wildfire nearby near ${nearestFire.name}` : null;

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextState = !soundActive;
    setSoundEnabled(nextState);
    setSoundActiveState(nextState);
    if (nextState) {
      playAlertSound('critical');
    }
  };

  // Search selection handler
  const handleSelectSearchResult = (target) => {
    const coords = Array.isArray(target) ? target : target.coords;
    const name = target?.name || 'Selected Place';
    setFlyTarget({ coords, zoom: 13, timestamp: Date.now() });
    setTelemetryCoords(coords);
    setNavTargetDestination({
      name,
      coords
    });
    setToast({
      message: `Selected: ${name} — Click Directions to navigate.`
    });
  };

  // Focus on a specific disaster
  const handleFocusDisaster = (disaster) => {
    setFlyTarget({ coords: [disaster.latitude, disaster.longitude], zoom: 12, timestamp: Date.now() });
    setTelemetryCoords([disaster.latitude, disaster.longitude]);
    setSelectedDisaster(disaster);
  };

  // Recenter to user or default India
  const handleRecenter = () => {
    const target = userLocation || [28.6139, 77.2090];
    setFlyTarget({ coords: target, zoom: userLocation ? 13 : 6, timestamp: Date.now() });
    setTelemetryCoords(target);
  };

  // Injected demo disaster handler
  const handleInjectDemoDisaster = (newDisaster) => {
    setDemoDisasters(prev => [newDisaster, ...prev]);
    knownIdsRef.current.add(newDisaster.id);
    handleFocusDisaster(newDisaster);

    const origin = userLocation || telemetryCoords;
    const dist = calculateDistance(origin[0], origin[1], newDisaster.latitude, newDisaster.longitude);

    setToast({
      disaster: newDisaster,
      message: `Demo ${newDisaster.type} placed on map`,
      distanceKm: dist
    });
    playAlertSound('critical');

    if (activeTrip) {
      const activeLine = remainingRouteGeoJSON || safeRouteGeoJSON || routeGeoJSON;
      checkAndHandleMidTripHazard(activeLine, [newDisaster, ...allDisasters], liveTripLocation);
    }
  };

  // Map click handler (supports both hazard placement and picking destination)
  const handleMapClick = (coords) => {
    if (isPlacingOnMap) {
      setPlacedCoords(coords);
      setIsPlacingOnMap(false);
      setDemoModalOpen(true);
    } else if (navDrawerOpen) {
      const pinName = `Dropped Pin (${coords[0].toFixed(3)}, ${coords[1].toFixed(3)})`;
      setNavTargetDestination({
        name: pinName,
        coords
      });
      setToast({
        message: `Destination set to ${pinName}`
      });
    }
  };

  // Start map placement mode
  const handleStartMapPlacement = () => {
    setIsPlacingOnMap(true);
    setDemoModalOpen(false);
  };

  // Clear demo disasters
  const handleClearDemoDisasters = () => {
    setDemoDisasters([]);
  };

  // Route calculation callback with post-verification
  const handleRouteCalculated = ({ 
    primaryRoute, 
    safeRoute, 
    warningRoute,
    isHazardous, 
    isVerifiedSafe,
    avoidPolygonDebug,
    intersectedDisasters, 
    startCoords, 
    endCoords 
  }) => {
    setRouteGeoJSON(primaryRoute);
    setSafeRouteGeoJSON(safeRoute);
    setWarningRouteGeoJSON(warningRoute);
    setIsHazardous(isHazardous);
    setIsVerifiedSafe(isVerifiedSafe);
    setAvoidPolygonDebug(avoidPolygonDebug);

    if (startCoords && endCoords) {
      const midLat = (startCoords[0] + endCoords[0]) / 2;
      const midLon = (startCoords[1] + endCoords[1]) / 2;
      setFlyTarget({ coords: [midLat, midLon], zoom: 11, timestamp: Date.now() });
      setTelemetryCoords([midLat, midLon]);
    }

    if (isHazardous) {
      if (isVerifiedSafe) {
        setToast({
          message: `Route recalculated to avoid ${intersectedDisasters?.[0]?.name || 'hazard'} — Post-verification confirmed zero intersections.`
        });
      } else {
        playAlertSound('critical');
        setToast({
          message: `⚠️ Warning: Route still passes near ${intersectedDisasters?.[0]?.name || 'hazard'} — Could not fully avoid!`
        });
      }
    } else {
      setToast({
        message: 'Route looks clear — Zero disaster perimeters along this road.'
      });
    }
  };

  // Start Active Trip Guidance
  const handleStartTrip = ({ route, destinationName, destinationCoords, originCoords, isVerifiedSafe: tripSafe }) => {
    setActiveTrip(true);
    const startLoc = (isGpsActive && userLocation) ? userLocation : originCoords;
    const initialRemaining = route || safeRouteGeoJSON || warningRouteGeoJSON || routeGeoJSON;

    setTripData({
      fullRoute: initialRemaining,
      destinationName,
      destinationCoords,
      originCoords
    });

    setLiveTripLocation(startLoc);
    setRemainingRouteGeoJSON(initialRemaining);
    setDistanceRemainingKm(getRouteLengthKm(initialRemaining));
    setMidTripAlert(null);
    setIsSimulatingDrive(false);
    simIndexRef.current = 0;

    setFlyTarget({ coords: startLoc, zoom: 13, timestamp: Date.now() });
    setTelemetryCoords(startLoc);

    if ('geolocation' in navigator && isGpsActive) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          handlePositionTick(newPos);
        },
        (err) => console.log('Trip watch error:', err),
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    }

    setToast({
      message: tripSafe 
        ? 'Navigation started — Route avoids known hazard zones' 
        : 'Navigation started — Caution: route passes near active hazard zone'
    });
  };

  // End Active Trip Guidance
  const handleEndTrip = () => {
    setActiveTrip(false);
    setIsSimulatingDrive(false);
    setTripData(null);
    setLiveTripLocation(null);
    setRemainingRouteGeoJSON(null);
    setDistanceRemainingKm(null);
    setMidTripAlert(null);
    simIndexRef.current = 0;

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setToast({
      message: 'Navigation ended'
    });
  };

  // Clear active route completely
  const handleClearRoute = () => {
    handleEndTrip();
    setRouteGeoJSON(null);
    setSafeRouteGeoJSON(null);
    setWarningRouteGeoJSON(null);
    setIsHazardous(false);
    setIsVerifiedSafe(false);
    setAvoidPolygonDebug(null);
  };

  // Drive Simulation Effect
  useEffect(() => {
    if (!isSimulatingDrive || !activeTrip) return;

    const currentLine = remainingRouteGeoJSON || safeRouteGeoJSON || warningRouteGeoJSON || routeGeoJSON;
    const coordsList = extractCoordsFromGeoJSON(currentLine);

    if (coordsList.length === 0) return;

    const interval = setInterval(() => {
      simIndexRef.current = simIndexRef.current + 1;

      if (simIndexRef.current >= coordsList.length) {
        setIsSimulatingDrive(false);
        playAlertSound('warning');
        setToast({
          message: `Arrived safely at ${tripData?.destinationName || 'destination'}!`
        });
        return;
      }

      const nextCoord = coordsList[simIndexRef.current];
      handlePositionTick(nextCoord);
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulatingDrive, activeTrip, remainingRouteGeoJSON, safeRouteGeoJSON, warningRouteGeoJSON, routeGeoJSON, extractCoordsFromGeoJSON, handlePositionTick, tripData]);

  return (
    <div className="app-container">
      {/* 1. Slide-in Drawer (Hamburger Menu, hidden by default) */}
      <Sidebar
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        disastersCount={counts.total}
        onOpenDirections={() => setNavDrawerOpen(true)}
        onOpenDemoModal={() => setDemoModalOpen(true)}
        onExpandAlerts={() => setAlertsExpanded(true)}
      />

      {/* Main Fullscreen Map Stage */}
      <main className="main-stage">
        {/* 2 & 3. Top-Left Floating Controls: Search / Directions Card + Filter Chips */}
        <div className="top-left-widget">
          {navDrawerOpen ? (
            <NavDrawer
              isOpen={navDrawerOpen}
              onClose={() => setNavDrawerOpen(false)}
              userLocation={userLocation}
              isGpsActive={isGpsActive}
              disasters={allDisasters}
              initialDestination={navTargetDestination}
              onRouteCalculated={handleRouteCalculated}
              onClearRoute={handleClearRoute}
              activeTrip={activeTrip}
              onStartTrip={handleStartTrip}
              onEndTrip={handleEndTrip}
            />
          ) : (
            <TopBarSearch
              onOpenDrawer={() => setDrawerOpen(true)}
              onOpenDirections={(target) => {
                if (target) {
                  setNavTargetDestination(target);
                }
                setNavDrawerOpen(true);
              }}
              onSelectSearchResult={handleSelectSearchResult}
            />
          )}

          {/* Filter Chips Bar (sitting neatly beneath search bar/directions card) */}
          <FilterChips
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            counts={counts}
            routeActive={!!routeGeoJSON}
            onClearRoute={handleClearRoute}
          />
        </div>

        {/* Top-Right Utility Controls (Demo Mode pill, Sound siren, Legend) & Dismissible Alert */}
        <TopBarUtilities
          soundActive={soundActive}
          onToggleSound={handleToggleSound}
          onOpenDemoModal={() => setDemoModalOpen(true)}
          legendOpen={legendOpen}
          onToggleLegend={() => setLegendOpen(prev => !prev)}
          hasNearbyHazard={hasNearbyFire}
          nearbyHazardText={nearbyFireText}
        />

        {/* Turn-by-Turn Consumer Navigation Banner (Active during trip) */}
        <ActiveTripHUD
          isActive={activeTrip}
          destinationName={tripData?.destinationName}
          distanceRemainingKm={distanceRemainingKm}
          isRerouting={isReroutingMidTrip}
          midTripAlert={midTripAlert}
          isVerifiedSafe={isVerifiedSafe}
          isHazardous={isHazardous}
          onEndTrip={handleEndTrip}
          isSimulating={isSimulatingDrive}
          onToggleSimulate={() => setIsSimulatingDrive(prev => !prev)}
        />

        {/* 4. Floating Map Legend */}
        <GeospatialKey
          isOpen={legendOpen}
          onClose={() => setLegendOpen(false)}
        />

        {/* 6. Main Map View with Standard Bottom-Right Controls, Bottom-Left Layers, and Verified RouteLayer */}
        <MapView
          disasters={allDisasters}
          activeFilter={activeFilter}
          userLocation={userLocation}
          isGpsActive={isGpsActive}
          initialCenter={[28.6139, 77.2090]}
          initialZoom={6}
          flyTarget={flyTarget}
          onCenterChange={setTelemetryCoords}
          onSelectDisaster={handleFocusDisaster}
          routeGeoJSON={routeGeoJSON}
          safeRouteGeoJSON={safeRouteGeoJSON}
          warningRouteGeoJSON={warningRouteGeoJSON}
          isHazardous={isHazardous}
          isVerifiedSafe={isVerifiedSafe}
          avoidPolygonDebug={avoidPolygonDebug}
          onRecenter={handleRecenter}
          isPlacingOnMap={isPlacingOnMap}
          onMapClick={handleMapClick}
          activeTrip={activeTrip}
          liveTripLocation={liveTripLocation}
        />

        {/* 7. Collapsible Bottom Sheet for Active Alerts */}
        <AlertSheet
          disasters={allDisasters}
          userLocation={userLocation}
          referenceCoords={telemetryCoords}
          isExpanded={alertsExpanded}
          onToggleExpand={() => setAlertsExpanded(prev => !prev)}
          onSelectDisaster={handleFocusDisaster}
        />

        {/* Incident Detail Card Popup */}
        <DetailModal
          disaster={selectedDisaster}
          onClose={() => setSelectedDisaster(null)}
          onEvacuate={({ destinationName, destinationCoords, originName, originCoords }) => {
            setSelectedDisaster(null);
            setNavTargetDestination({
              name: destinationName,
              coords: destinationCoords,
              originName,
              originCoords
            });
            setNavDrawerOpen(true);
          }}
          onRouteAround={(d) => {
            setSelectedDisaster(null);
            setNavTargetDestination({
              name: d.name,
              coords: [d.latitude, d.longitude]
            });
            setNavDrawerOpen(true);
          }}
        />

        {/* 9. Demo Mode Simulation Modal */}
        <DemoModal
          isOpen={demoModalOpen}
          onClose={() => {
            setDemoModalOpen(false);
            setIsPlacingOnMap(false);
          }}
          mapCenter={telemetryCoords}
          onInjectDisaster={handleInjectDemoDisaster}
          onClearDemoDisasters={handleClearDemoDisasters}
          demoDisastersCount={demoDisasters.length}
          isPlacingOnMap={isPlacingOnMap}
          onStartMapPlacement={handleStartMapPlacement}
          placedCoords={placedCoords}
          activeTrip={activeTrip}
          activeRoute={remainingRouteGeoJSON || safeRouteGeoJSON || warningRouteGeoJSON || routeGeoJSON}
        />

        {/* Real-Time Toast Notification */}
        <ToastNotification
          toast={toast}
          onClose={() => setToast(null)}
          onView={handleFocusDisaster}
        />
      </main>
    </div>
  );
}
