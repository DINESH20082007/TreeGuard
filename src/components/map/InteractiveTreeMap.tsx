import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import L from 'leaflet';
import { Tree, TreeStatus } from '../../services/trees';
import { calculateHaversineDistance, formatDistance, getDirectionsUrl } from '../../utils/geo';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface InteractiveTreeMapProps {
  trees: Tree[];
  selectedTree: Tree | null;
  onSelectTree: (tree: Tree | null) => void;
  userLocation: UserLocation | null;
  onUserLocationChange: (loc: UserLocation | null) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

const statusColors: Record<TreeStatus, { bg: string; border: string; badgeBg: string; badgeText: string }> = {
  healthy: { bg: '#22c55e', border: '#ffffff', badgeBg: '#dcfce7', badgeText: '#15803d' },
  monitoring: { bg: '#eab308', border: '#ffffff', badgeBg: '#fef9c3', badgeText: '#854d0e' },
  'at-risk': { bg: '#f97316', border: '#ffffff', badgeBg: '#ffedd5', badgeText: '#9a3412' },
  emergency: { bg: '#ef4444', border: '#ffffff', badgeBg: '#fee2e2', badgeText: '#991b1b' },
};

export const InteractiveTreeMap: React.FC<InteractiveTreeMapProps> = ({
  trees,
  selectedTree,
  onSelectTree,
  userLocation,
  onUserLocationChange,
  defaultCenter = [11.0168, 76.9558],
  defaultZoom = 14,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const navigate = useNavigate();

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false, // Custom clean controls
    });

    // OpenStreetMap standard tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Request user location via Geolocation API
  const requestLocation = (showAutoNotification = false) => {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPermissionDenied(false);
        setGeoError(null);
        const { latitude, longitude, accuracy } = pos.coords;
        onUserLocationChange({ latitude, longitude, accuracy });
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setGeoError('Location permission is required to calculate your distance from this tree.');
        } else if (err.code === err.TIMEOUT) {
          setGeoError('Location request timed out. Please try again.');
        } else {
          setGeoError('Unable to retrieve your current location.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  // When a tree is selected and user location is not yet obtained, attempt to request location once
  useEffect(() => {
    if (selectedTree && !userLocation && !permissionDenied && !locating) {
      requestLocation(true);
    }
  }, [selectedTree]);

  // Update Tree Markers when trees or selectedTree changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    trees.forEach((tree) => {
      if (tree.latitude === undefined || tree.longitude === undefined || isNaN(tree.latitude) || isNaN(tree.longitude)) {
        return;
      }

      const isSelected = selectedTree?.id === tree.id;
      const isEmergency = tree.status === 'emergency';
      const colorConfig = statusColors[tree.status] || statusColors.healthy;

      const markerHtml = `
        <div class="tree-marker-pin ${isSelected ? 'selected' : ''}" style="
          width: ${isSelected ? '32px' : '24px'};
          height: ${isSelected ? '32px' : '24px'};
          background-color: ${colorConfig.bg};
          border: 2.5px solid ${colorConfig.border};
          position: relative;
        ">
          ${isEmergency ? '<div class="pulse-radar-emergency"></div>' : ''}
          <span style="font-size: ${isSelected ? '14px' : '11px'}; color: #ffffff; line-height: 1; user-select: none;">🌳</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-tree-div-icon',
        html: markerHtml,
        iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
        iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
        popupAnchor: [0, isSelected ? -16 : -12],
      });

      const marker = L.marker([tree.latitude, tree.longitude], { icon: customIcon });

      // Calculate distance if user location is available
      let distanceText = '';
      if (userLocation) {
        const distMeters = calculateHaversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          tree.latitude,
          tree.longitude
        );
        distanceText = `
          <div class="flex items-center gap-1.5 text-xs text-forest-700 font-semibold bg-forest-50 border border-forest-200 px-2.5 py-1 rounded-md mb-2">
            <span>📍</span> <span>${formatDistance(distMeters)} from you</span>
          </div>
        `;
      }

      // Rich popup
      const popupContent = `
        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-xs font-mono text-gray-400 font-medium">${tree.id}</p>
              <h3 class="font-semibold text-gray-900 text-sm leading-tight">${tree.species}</h3>
              <p class="text-xs text-gray-500">${tree.common_name}</p>
            </div>
            <span style="background-color: ${colorConfig.badgeBg}; color: ${colorConfig.badgeText};" class="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize">
              ${tree.status.replace('-', ' ')}
            </span>
          </div>

          ${distanceText}

          <p class="text-xs text-gray-600 mb-3 flex items-center gap-1">
            <span>📍</span> <span class="truncate">${tree.location_name}</span>
          </p>

          <div class="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Health Score</span>
              <span class="font-semibold text-gray-800">${tree.health_score}/100</span>
            </div>
            <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div style="width: ${tree.health_score}%; background-color: ${colorConfig.bg};" class="h-full rounded-full transition-all"></div>
            </div>
            <p class="text-[11px] text-gray-400 mt-1.5">Last inspection: ${tree.last_inspection}</p>
          </div>

          <div class="flex gap-2">
            <a
              href="${getDirectionsUrl(tree.latitude, tree.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg transition-colors text-center"
            >
              Directions ↗
            </a>
            <button
              id="view-tree-btn-${tree.id}"
              class="flex-1 bg-[#2d6a4f] hover:bg-[#1b4332] text-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer text-center"
            >
              Details →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, closeButton: true });

      marker.on('click', () => {
        onSelectTree(tree);
      });

      marker.on('popupopen', () => {
        onSelectTree(tree);
        const btn = document.getElementById(`view-tree-btn-${tree.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            navigate(`/app/tree/${tree.id}`);
          };
        }
      });

      marker.addTo(layerGroup);
    });
  }, [trees, selectedTree, userLocation]);

  // Handle User Location Marker, Distance Polyline, and Dual-Viewport Framing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Manage User Location Marker (📍)
    if (userLocation) {
      const userHtml = `
        <div class="user-marker-badge" title="Your Location">
          <span style="user-select: none;">📍</span>
        </div>
      `;
      const userIcon = L.divIcon({
        className: 'custom-user-marker-div',
        html: userHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
        userMarkerRef.current.setIcon(userIcon);
      } else {
        const marker = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userIcon,
          zIndexOffset: 1500,
        })
          .bindPopup(
            '<div class="p-3 text-xs font-semibold text-gray-800">📍 Your Current Location</div>'
          )
          .addTo(map);
        userMarkerRef.current = marker;
      }
    } else {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
    }

    // 2. Manage Distance Line between User and Selected Tree
    if (
      userLocation &&
      selectedTree &&
      selectedTree.latitude !== undefined &&
      selectedTree.longitude !== undefined &&
      !isNaN(selectedTree.latitude) &&
      !isNaN(selectedTree.longitude)
    ) {
      const userLatLng: L.LatLngTuple = [userLocation.latitude, userLocation.longitude];
      const treeLatLng: L.LatLngTuple = [selectedTree.latitude, selectedTree.longitude];

      const distanceMeters = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        selectedTree.latitude,
        selectedTree.longitude
      );
      const formattedDistance = formatDistance(distanceMeters);

      if (distanceLineRef.current) {
        distanceLineRef.current.setLatLngs([userLatLng, treeLatLng]);
        distanceLineRef.current.setTooltipContent(`Distance: ${formattedDistance}`);
      } else {
        const polyline = L.polyline([userLatLng, treeLatLng], {
          color: '#16a34a',
          weight: 3.5,
          dashArray: '7, 8',
          opacity: 0.9,
          lineCap: 'round',
        })
          .bindTooltip(`Distance: ${formattedDistance}`, {
            permanent: true,
            direction: 'center',
            className: 'distance-path-tooltip',
          })
          .addTo(map);

        distanceLineRef.current = polyline;
      }

      // Auto adjust map viewport so BOTH markers are visible with generous padding
      const bounds = L.latLngBounds([userLatLng, treeLatLng]);
      map.fitBounds(bounds, {
        padding: [90, 90],
        maxZoom: 16,
        animate: true,
        duration: 1.2,
      });
    } else {
      // Remove distance polyline if one of the locations is missing
      if (distanceLineRef.current) {
        map.removeLayer(distanceLineRef.current);
        distanceLineRef.current = null;
      }

      // If only selected tree is active without user location, fly to tree
      if (
        selectedTree &&
        selectedTree.latitude !== undefined &&
        selectedTree.longitude !== undefined &&
        !isNaN(selectedTree.latitude) &&
        !isNaN(selectedTree.longitude)
      ) {
        map.flyTo([selectedTree.latitude, selectedTree.longitude], 16, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    }
  }, [userLocation, selectedTree]);

  // Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation && selectedTree) {
      const bounds = L.latLngBounds([
        [userLocation.latitude, userLocation.longitude],
        [selectedTree.latitude, selectedTree.longitude],
      ]);
      map.fitBounds(bounds, { padding: [90, 90], maxZoom: 16 });
    } else if (selectedTree) {
      map.flyTo([selectedTree.latitude, selectedTree.longitude], 16);
    } else if (userLocation) {
      map.flyTo([userLocation.latitude, userLocation.longitude], 16);
    } else {
      map.flyTo(defaultCenter, defaultZoom);
    }
  };

  // Calculated distance for selected tree
  const hasValidTreeCoords =
    selectedTree &&
    selectedTree.latitude !== undefined &&
    selectedTree.longitude !== undefined &&
    !isNaN(selectedTree.latitude) &&
    !isNaN(selectedTree.longitude);

  const selectedDistanceMeters =
    userLocation && hasValidTreeCoords
      ? calculateHaversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          selectedTree.latitude,
          selectedTree.longitude
        )
      : null;

  return (
    <div className="relative w-full h-full">
      {/* Leaflet container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Geolocation Notice / Error Banner */}
      {geoError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-lg animate-fade-in">
          <span className="text-base">📍</span>
          <span className="flex-1 font-medium">{geoError}</span>
          <button
            onClick={() => setGeoError(null)}
            className="text-amber-600 hover:text-amber-800 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* FLOATING TWO-LOCATION DISTANCE INFORMATION CARD */}
      {selectedTree && (
        <div className="absolute top-4 left-4 z-20 w-[calc(100%-2rem)] sm:w-88 bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl p-4 text-gray-900 transition-all animate-fade-in">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 bg-forest-50 px-2 py-0.5 rounded-md border border-forest-200">
                  Selected Tree
                </span>
                <span className="text-xs font-mono text-gray-400 font-medium">{selectedTree.id}</span>
              </div>
              <h2 className="text-sm font-bold text-gray-900 mt-1 leading-tight">{selectedTree.species}</h2>
              <p className="text-xs text-gray-500 italic">{selectedTree.common_name}</p>
            </div>
            <button
              onClick={() => onSelectTree(null)}
              className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition cursor-pointer text-sm"
              title="Close card"
            >
              ✕
            </button>
          </div>

          {/* Invalid Tree Coordinates Case */}
          {!hasValidTreeCoords ? (
            <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ Tree location is unavailable.
            </div>
          ) : (
            <>
              {/* Location Rows: User Location vs Tree Location */}
              <div className="py-3 space-y-2 text-xs border-b border-gray-100">
                {/* 📍 User Location */}
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none">📍</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800">Your Location</p>
                    {userLocation ? (
                      <p className="text-[11px] text-gray-500 font-mono">
                        {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-700">
                        {permissionDenied
                          ? 'Permission denied'
                          : 'Location not enabled'}
                      </p>
                    )}
                  </div>
                  {!userLocation && (
                    <button
                      onClick={() => requestLocation()}
                      disabled={locating}
                      className="text-[11px] bg-forest-700 hover:bg-forest-800 text-white font-medium px-2.5 py-1 rounded-md transition cursor-pointer disabled:opacity-50"
                    >
                      {locating ? 'Locating…' : 'Enable'}
                    </button>
                  )}
                </div>

                {/* 🌳 Tree Location */}
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none">🌳</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800">Tree Location</p>
                    <p className="text-[11px] text-gray-600 truncate">{selectedTree.location_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {selectedTree.latitude.toFixed(4)}, {selectedTree.longitude.toFixed(4)}
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: (statusColors[selectedTree.status] || statusColors.healthy).badgeBg,
                      color: (statusColors[selectedTree.status] || statusColors.healthy).badgeText,
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                  >
                    {selectedTree.status.replace('-', ' ')}
                  </span>
                </div>
              </div>

              {/* Distance Section */}
              <div className="py-3">
                {userLocation && selectedDistanceMeters !== null ? (
                  <div className="bg-gradient-to-br from-forest-50 to-emerald-50 border border-forest-200 rounded-xl p-3 text-center">
                    <p className="text-[11px] font-medium text-forest-800 uppercase tracking-wide">
                      Distance From You
                    </p>
                    <p className="text-2xl font-bold text-forest-800 my-0.5">
                      {formatDistance(selectedDistanceMeters)}
                    </p>
                    <p className="text-[10px] text-forest-600 font-medium flex items-center justify-center gap-1">
                      <span>📏</span> Direct straight-line distance
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center space-y-1.5">
                    <p className="text-xs text-amber-800 font-medium">
                      Enable location access to see your distance from this tree.
                    </p>
                    <button
                      onClick={() => requestLocation()}
                      disabled={locating}
                      className="text-xs bg-forest-700 hover:bg-forest-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                    >
                      {locating ? 'Requesting Location…' : '📍 Enable Location Access'}
                    </button>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={getDirectionsUrl(selectedTree.latitude, selectedTree.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-xl transition text-center"
                >
                  <span>🧭</span> Directions ↗
                </a>
                <button
                  onClick={() => navigate(`/app/tree/${selectedTree.id}`)}
                  className="flex-1 bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold py-2 rounded-xl transition cursor-pointer text-center"
                >
                  View Details →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Map Floating Right Controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
        {/* Locate Me */}
        <button
          onClick={() => requestLocation()}
          disabled={locating}
          title="Locate Me"
          className={`w-9 h-9 rounded-xl shadow-md border flex items-center justify-center transition-all cursor-pointer disabled:opacity-60 ${
            userLocation
              ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-forest-50 hover:text-forest-700 hover:border-forest-200'
          }`}
        >
          {locating ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-base leading-none">⌖</span>
          )}
        </button>

        {/* Recenter */}
        <button
          onClick={handleRecenter}
          title="Recenter Map"
          className="w-9 h-9 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-forest-50 hover:text-forest-700 hover:border-forest-200 transition-all cursor-pointer"
        >
          <span className="text-sm font-semibold">◎</span>
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-9 h-9 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 text-base font-semibold transition-all cursor-pointer"
        >
          ＋
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-9 h-9 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 text-base font-semibold transition-all cursor-pointer"
        >
          －
        </button>
      </div>

      {/* Compact Bottom Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur border border-gray-200 shadow-md rounded-xl px-3.5 py-2 flex items-center gap-3.5 text-xs font-medium text-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
          <span>Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 ring-2 ring-white" />
          <span>Monitoring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
          <span>At Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          <span>Emergency</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTreeMap;
