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

// Truck Icon
const truckIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #2563eb; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-size: 22px; transition: all 0.5s linear;">🚚</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
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

// 2. Routing WITH STEPS (Turn-by-Turn)
async function getRoadRouteWithSteps(start: [number, number], end: [number, number]) {
  try {
    // Request 'steps=true' to get turn instructions
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
      const steps = data.routes[0].legs[0].steps; // Get turn instructions
      return { coordinates, steps };
    }
    return { coordinates: [start, end], steps: [] };
  } catch (error) { return { coordinates: [start, end], steps: [] }; }
}

// Random Orders
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

// --- HINDI SLANG GENERATOR ---
const getInstructionSlang = (modifier: string, type: string) => {
    if (type === 'arrive') return "Bas pahunch gaye ustaad. Gaadi side laga lo.";
    if (modifier?.includes('left')) return "Ustaad, aage se Left le lena.";
    if (modifier?.includes('right')) return "Bhai, Right ka cut maaro.";
    if (modifier?.includes('straight')) return "Seedha kheecho, rasta saaf hai.";
    if (modifier?.includes('uturn')) return "Yahan se U-Turn ghumao.";
    return "Chalte raho.";
};

// --- VOICE LOGIC ---
const speakDelhiStyle = (text: string) => {
  if (!window.speechSynthesis) return;
  
  // Don't interrupt if already speaking the exact same phrase
  if (window.speechSynthesis.speaking) {
      // optional: cancel if you want instant override, but for smooth flow we might wait
      // window.speechSynthesis.cancel(); 
  }

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a better voice (Google Hindi is best if available)
  const voices = window.speechSynthesis.getVoices();
  const hindiVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("hi")) || voices.find(v => v.lang.includes("hi"));
  
  if (hindiVoice) utterance.voice = hindiVoice;
  utterance.lang = 'hi-IN';
  utterance.rate = 0.85; // Slow down for "Human" feel
  utterance.pitch = 0.9; // Lower pitch = more authoritative/male driver feel

  window.speechSynthesis.speak(utterance);
};

// Distance Helper
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const [navSteps, setNavSteps] = useState<any[]>([]); // Store OSRM Steps
  const [loading, setLoading] = useState(false);
  const [matchedOrders, setMatchedOrders] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentInstruction, setCurrentInstruction] = useState("Route Calcuating...");
  
  // ANIMATION STATE
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());

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
      spokenSteps.current.clear();
      if(animationRef.current) clearInterval(animationRef.current);

      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        setTruckPos(start);
        
        // GET ROUTE + STEPS
        const { coordinates, steps } = await getRoadRouteWithSteps(start, end);
        setRoutePath(coordinates);
        setNavSteps(steps); // Save instructions

        // Packet Switching
        const matches: number[] = [];
        allOrders.forEach(order => {
            let isNear = false;
            for (let i = 0; i < coordinates.length; i += 5) {
                if (getDistanceFromLatLonInKm(order.pos[0], order.pos[1], coordinates[i][0], coordinates[i][1]) < 1.5) {
                    isNear = true; break;
                }
            }
            if (isNear) matches.push(order.id);
        });
        setMatchedOrders(matches);

        // Start Voice
        if (soundEnabled) {
            setTimeout(() => {
                speakDelhiStyle(`Chalo ustaad, ${intent.origin} se ${intent.destination} ka route set hai.`);
            }, 1000);
        }
      }
      setLoading(false);
    };

    fetchPath();
  }, [intent, allOrders]);

  // --- SMOOTH SLOW ANIMATION ---
  useEffect(() => {
    if (routePath.length > 0) {
        animationRef.current = setInterval(() => {
            setPathIndex((prev) => {
                const next = prev + 1; // Move 1 step at a time (Slow)
                
                // --- NAVIGATION LOGIC ---
                if (routePath[next]) {
                    const currentLoc = routePath[next];
                    
                    // Check if current location matches any Turn Step
                    // OSRM steps don't map 1:1 to coordinates indices, so we use proximity check
                    // But for demo simplicity, we process 'steps' sequentially based on progress
                    
                    // Simple Logic: Map % progress of steps to % progress of path
                    const progress = next / routePath.length;
                    const stepIndex = Math.floor(progress * navSteps.length);
                    
                    if (navSteps[stepIndex] && !spokenSteps.current.has(stepIndex)) {
                        const step = navSteps[stepIndex];
                        const maneuver = step.maneuver;
                        
                        // Only speak if it's a turn (ignore 'depart')
                        if (maneuver.type !== 'depart' && maneuver.type !== 'arrive') {
                            const slang = getInstructionSlang(maneuver.modifier, maneuver.type);
                            if (soundEnabled) speakDelhiStyle(slang);
                            setCurrentInstruction(slang);
                        }
                        spokenSteps.current.add(stepIndex);
                    }
                }

                if (next >= routePath.length - 1) {
                    if (animationRef.current) clearInterval(animationRef.current);
                    if (soundEnabled) speakDelhiStyle("Pahunch gaye ustaad. Delivery complete.");
                    return routePath.length - 1;
                }
                return next;
            });
        }, 200); // 200ms = Slower, smoother movement
    }
    return () => {
        if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [routePath, soundEnabled, navSteps]);

  useEffect(() => {
      if (routePath.length > 0 && routePath[pathIndex]) {
          setTruckPos(routePath[pathIndex]);
      }
  }, [pathIndex, routePath]);

  const bounds = originCoords && destCoords ? L.latLngBounds([originCoords, destCoords]) : null;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border shadow-sm relative group">
      
      <button 
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 left-14 z-[400] bg-white p-2 rounded-md shadow-md border border-gray-200 hover:bg-gray-50"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
      </button>

      <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <MapUpdater bounds={bounds} />

        {allOrders.map(order => (
            <Marker key={order.id} position={order.pos} icon={matchedOrders.includes(order.id) ? matchedOrderIcon : pendingOrderIcon} zIndexOffset={matchedOrders.includes(order.id) ? 1000 : 0}>
                <Popup>Weight: {order.weight}kg</Popup>
            </Marker>
        ))}

        {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.6 }} />}

        {truckPos && (
          <Marker position={truckPos} icon={truckIcon} zIndexOffset={9999}>
            <Popup>🚚 Live Tracking</Popup>
          </Marker>
        )}

        {originCoords && <Marker position={originCoords} opacity={0.6}><Popup>Origin</Popup></Marker>}
        {destCoords && <Marker position={destCoords} opacity={0.6}><Popup>Destination</Popup></Marker>}
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[500] flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 border border-blue-100">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-blue-900">Calculating Route...</span>
          </div>
        </div>
      )}

      {/* NAV DISPLAY BAR */}
      {!loading && routePath.length > 0 && (
          <div className="absolute bottom-6 left-6 right-6 z-[400] animate-in slide-in-from-bottom-4 flex justify-between items-end pointer-events-none">
              <div className="bg-white/95 backdrop-blur border border-green-200 p-4 rounded-lg shadow-xl pointer-events-auto">
                  <div className="flex items-center gap-2 mb-2">
                      <Navigation className="w-4 h-4 text-blue-600 animate-pulse" />
                      <h4 className="font-bold text-gray-800 text-sm">Live Navigation</h4>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                      <p>Found <strong className="text-green-700">{matchedOrders.length} packets</strong> on route.</p>
                      <p className="font-mono text-blue-700 bg-blue-50 p-1 rounded">"{currentInstruction}"</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DelhiMap;
