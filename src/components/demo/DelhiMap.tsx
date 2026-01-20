import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ParsedIntent } from "./VoiceInputPanel";

// Fix Leaflet Default Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CUSTOM ICONS ---

const truckIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">🚛</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Unmatched Order (Orange Dot)
const pendingOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #f97316; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14]
});

// Matched Order (Green Checkmark)
const matchedOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px #22c55e;">✓</div>`,
  iconSize: [20, 20]
});

// --- HELPER FUNCTIONS ---

// 1. Geocoding (Nominatim API)
async function geocodeLocation(placeName: string): Promise<[number, number] | null> {
  try {
    const query = `${placeName}, Delhi`;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch (error) {
    return null;
  }
}

// 2. Routing (OSRM API)
async function getRoadRoute(start: [number, number], end: [number, number]): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates;
      return coordinates.map((coord: number[]) => [coord[1], coord[0]]);
    }
    return [start, end];
  } catch (error) {
    return [start, end];
  }
}

// 3. Generate Random Orders in Delhi NCR
const generateRandomOrders = (count: number) => {
  const orders = [];
  // Approximate Bounding Box for Delhi
  const minLat = 28.45, maxLat = 28.85;
  const minLng = 77.05, maxLng = 77.35;

  for (let i = 0; i < count; i++) {
    const lat = Math.random() * (maxLat - minLat) + minLat;
    const lng = Math.random() * (maxLng - minLng) + minLng;
    orders.push({
      id: i,
      pos: [lat, lng] as [number, number],
      weight: Math.floor(Math.random() * 50) + 10 // Random weight 10-60kg
    });
  }
  return orders;
};

// 4. Calculate Distance (Haversine Formula approximation for short distances)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Component to handle map movement
function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

interface DelhiMapProps {
  intent: ParsedIntent | null;
}

export const DelhiMap = ({ intent }: DelhiMapProps) => {
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  
  // Static random orders (memoized so they don't move around)
  const allOrders = useMemo(() => generateRandomOrders(30), []);
  const [matchedOrders, setMatchedOrders] = useState<number[]>([]);

  useEffect(() => {
    const fetchPath = async () => {
      if (!intent) return;
      
      setLoading(true);
      setMatchedOrders([]); // Reset matches

      // 1. Geocode
      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        
        // 2. Get Route
        const path = await getRoadRoute(start, end);
        setRoutePath(path);

        // 3. CALCULATE MATCHES (Packet Switching Logic)
        // Find orders that are within 1km of ANY point on the route
        const matches: number[] = [];
        const PROXIMITY_THRESHOLD_KM = 1.5; // Distance to divert

        allOrders.forEach(order => {
            // We check a subset of route points to improve performance
            // Checking every 5th point is enough for accuracy
            let isNear = false;
            for (let i = 0; i < path.length; i += 5) {
                const dist = getDistanceFromLatLonInKm(
                    order.pos[0], order.pos[1],
                    path[i][0], path[i][1]
                );
                if (dist < PROXIMITY_THRESHOLD_KM) {
                    isNear = true;
                    break;
                }
            }
            if (isNear) matches.push(order.id);
        });
        setMatchedOrders(matches);
      }
      setLoading(false);
    };

    fetchPath();
  }, [intent, allOrders]);

  const bounds = originCoords && destCoords ? L.latLngBounds([originCoords, destCoords]) : null;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border shadow-sm relative group">
      <MapContainer 
        center={[28.6139, 77.2090]} 
        zoom={11} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater bounds={bounds} />

        {/* --- ORDERS LAYER --- */}
        {allOrders.map(order => {
            const isMatched = matchedOrders.includes(order.id);
            return (
                <Marker 
                    key={order.id} 
                    position={order.pos} 
                    icon={isMatched ? matchedOrderIcon : pendingOrderIcon}
                    zIndexOffset={isMatched ? 1000 : 0} // Matched on top
                >
                    <Popup>
                        <div className="text-xs">
                            <strong>{isMatched ? "✅ Packet Matched!" : "📦 Pending Load"}</strong><br/>
                            Weight: {order.weight}kg
                        </div>
                    </Popup>
                </Marker>
            );
        })}

        {/* --- ROUTE LAYER --- */}
        {routePath.length > 0 && (
          <Polyline 
            positions={routePath} 
            pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.7, lineCap: 'round' }} 
          />
        )}

        {/* --- TRUCK MARKERS --- */}
        {originCoords && (
          <Marker position={originCoords} icon={truckIcon} zIndexOffset={2000}>
            <Popup className="font-bold">Origin: {intent?.origin}</Popup>
          </Marker>
        )}
        
        {destCoords && (
          <Marker position={destCoords} zIndexOffset={2000}>
            <Popup className="font-bold">Destination: {intent?.destination}</Popup>
          </Marker>
        )}

      </MapContainer>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[500] flex items-center justify-center transition-all">
          <div className="bg-white px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 border border-blue-100">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
                <span className="block text-sm font-bold text-blue-900">Calculating Grid Route...</span>
                <span className="text-xs text-blue-500">Optimizing Packet Switching</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overlay */}
      {matchedOrders.length > 0 && !loading && (
          <div className="absolute bottom-6 left-6 z-[400] animate-in slide-in-from-bottom-4">
              <div className="bg-white/95 backdrop-blur border border-green-200 p-4 rounded-lg shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                      <h4 className="font-bold text-green-800 text-sm">Optimization Active</h4>
                  </div>
                  <div className="text-xs text-gray-600">
                      Found <strong className="text-green-700 text-lg">{matchedOrders.length}</strong> additional loads<br/>
                      along this route.
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DelhiMap;