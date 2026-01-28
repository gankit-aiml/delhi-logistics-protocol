import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Volume2, VolumeX, Navigation } from "lucide-react"; 
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ParsedIntent } from "./VoiceInputPanel";

// --- FIX ICONS ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Dynamic Truck Icon
const truckIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #2563eb; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-size: 20px; transition: all 0.3s ease;">🚚</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Order Icons
const pendingOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #f97316; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14]
});

const matchedOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px #22c55e;">✓</div>`,
  iconSize: [20, 20]
});

// --- API HELPERS ---
async function geocodeLocation(placeName: string): Promise<[number, number] | null> {
  try {
    let query = `${placeName}, Delhi`;
    let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    let data = await response.json();
    if (!data || data.length === 0) {
        query = `${placeName}, India`;
        response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        data = await response.json();
    }
    if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch (error) { return null; }
}

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
  } catch (error) { return [start, end]; }
}

const generateRandomOrders = (count: number) => {
  const orders = [];
  const minLat = 28.45, maxLat = 28.85;
  const minLng = 77.05, maxLng = 77.35;
  for (let i = 0; i < count; i++) {
    orders.push({
      id: i,
      pos: [Math.random() * (maxLat - minLat) + minLat, Math.random() * (maxLng - minLng) + minLng] as [number, number],
      weight: Math.floor(Math.random() * 50) + 10
    });
  }
  return orders;
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- VOICE LOGIC ---
const speakDelhiStyle = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hi-IN';
  utterance.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const hindiVoice = voices.find(v => v.lang.includes('hi'));
  if (hindiVoice) utterance.voice = hindiVoice;
  window.speechSynthesis.speak(utterance);
};

// Map Auto-Zoom
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
  const [matchedOrders, setMatchedOrders] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // ANIMATION STATE
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenArrival = useRef(false);

  const allOrders = useMemo(() => generateRandomOrders(30), []);

  useEffect(() => {
    const fetchPath = async () => {
      if (!intent) {
        setTruckPos(null);
        return;
      }
      
      setLoading(true);
      setMatchedOrders([]);
      setPathIndex(0);
      hasSpokenArrival.current = false;
      if(animationRef.current) clearInterval(animationRef.current);

      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        setTruckPos(start); // Start truck at origin
        
        const path = await getRoadRoute(start, end);
        setRoutePath(path);

        // Packet Switching Logic
        const matches: number[] = [];
        allOrders.forEach(order => {
            let isNear = false;
            for (let i = 0; i < path.length; i += 5) {
                if (getDistanceFromLatLonInKm(order.pos[0], order.pos[1], path[i][0], path[i][1]) < 1.5) {
                    isNear = true; break;
                }
            }
            if (isNear) matches.push(order.id);
        });
        setMatchedOrders(matches);

        // Start Navigation Voice
        if (soundEnabled) {
            setTimeout(() => {
                speakDelhiStyle(`Chalo ustaad, ${intent.origin} se ${intent.destination} ka route clear hai.`);
            }, 1000);
        }
      }
      setLoading(false);
    };

    fetchPath();
  }, [intent, allOrders]);

  // --- ANIMATION LOOP ---
  useEffect(() => {
    if (routePath.length > 0) {
        animationRef.current = setInterval(() => {
            setPathIndex((prev) => {
                // Move 2 steps per tick for speed
                const next = prev + 2;
                
                // ARRIVAL CHECK
                if (next >= routePath.length - 1) {
                    if (animationRef.current) clearInterval(animationRef.current);
                    
                    if (soundEnabled && !hasSpokenArrival.current) {
                        speakDelhiStyle("Pahunch gaye ustaad. Delivery complete.");
                        hasSpokenArrival.current = true;
                    }
                    return routePath.length - 1;
                }
                return next;
            });
        }, 50); // 50ms refresh rate
    }
    return () => {
        if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [routePath, soundEnabled]);

  // Update truck position based on index
  useEffect(() => {
      if (routePath.length > 0 && routePath[pathIndex]) {
          setTruckPos(routePath[pathIndex]);
      }
  }, [pathIndex, routePath]);

  const bounds = originCoords && destCoords ? L.latLngBounds([originCoords, destCoords]) : null;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border shadow-sm relative group">
      
      {/* Sound Toggle */}
      <button 
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 left-14 z-[400] bg-white p-2 rounded-md shadow-md border border-gray-200 hover:bg-gray-50"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
      </button>

      <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <MapUpdater bounds={bounds} />

        {/* Orders */}
        {allOrders.map(order => (
            <Marker 
                key={order.id} 
                position={order.pos} 
                icon={matchedOrders.includes(order.id) ? matchedOrderIcon : pendingOrderIcon} 
                zIndexOffset={matchedOrders.includes(order.id) ? 1000 : 0}
            >
                <Popup>Weight: {order.weight}kg</Popup>
            </Marker>
        ))}

        {/* Route Line */}
        {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.6 }} />}

        {/* MOVING TRUCK */}
        {truckPos && (
          <Marker position={truckPos} icon={truckIcon} zIndexOffset={9999}>
            <Popup className="font-bold">🚚 DL-1L-8902<br/>Live Tracking</Popup>
          </Marker>
        )}

        {/* Start/End Markers */}
        {originCoords && <Marker position={originCoords} opacity={0.6}><Popup>Origin</Popup></Marker>}
        {destCoords && <Marker position={destCoords} opacity={0.6}><Popup>Destination</Popup></Marker>}

      </MapContainer>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[500] flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 border border-blue-100">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-blue-900">Calculating Route...</span>
          </div>
        </div>
      )}

      {/* Live Stats Overlay */}
      {!loading && routePath.length > 0 && (
          <div className="absolute bottom-6 left-6 z-[400] animate-in slide-in-from-bottom-4">
              <div className="bg-white/95 backdrop-blur border border-green-200 p-4 rounded-lg shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                      <Navigation className="w-4 h-4 text-blue-600 animate-pulse" />
                      <h4 className="font-bold text-gray-800 text-sm">Live Navigation</h4>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                      <p>Found <strong className="text-green-700">{matchedOrders.length} packets</strong> on route.</p>
                      <p>Speed Advisory: <strong className="text-blue-600">45 km/h (Green Wave)</strong></p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DelhiMap;
