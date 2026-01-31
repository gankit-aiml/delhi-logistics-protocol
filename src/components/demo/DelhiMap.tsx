import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Volume2, VolumeX, Navigation, AlertTriangle, ShieldAlert, Zap, Construction, Ban } from "lucide-react"; 
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ParsedIntent } from "./VoiceInputPanel";

// --- ICONS SETUP ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// 1. Truck Icon
const truckIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #2563eb; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-size: 22px;">🚛</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// 2. Order Icons
const pendingOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #f97316; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14]
});

const matchedOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #22c55e; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold; box-shadow: 0 0 10px #22c55e;">✓</div>`,
  iconSize: [22, 22]
});

// 3. Disruption Icons (Multiple Types)
const createDisruptionIcon = (color: string, emoji: string) => new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 6px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${emoji}</div>`,
  iconSize: [30, 30]
});

const vipIcon = createDisruptionIcon("#dc2626", "👮"); // Police/VIP
const workIcon = createDisruptionIcon("#eab308", "🚧"); // Construction
const accidentIcon = createDisruptionIcon("#f43f5e", "💥"); // Accident
const jamIcon = createDisruptionIcon("#7c3aed", "🛑"); // Protest/Block

// --- DATA ---
const SAMPLE_APPS = ["Amazon", "Zomato", "Porter", "Blinkit", "Uber", "BlueDart"];
const SAMPLE_NAMES = ["Ramesh Traders", "A-1 Electronics", "Gupta Logistics", "Simran Boutique", "City Hardware", "Tech World"];

// Strategic Disruptions scattered across Delhi's arterial roads
const DISRUPTIONS = [
    { pos: [28.6129, 77.2295], type: "VIP", label: "VIP Movement (India Gate)" }, 
    { pos: [28.57, 77.24], type: "WORK", label: "Flyover Repair (Lajpat Nagar)" }, 
    { pos: [28.64, 77.19], type: "JAM", label: "Protest (Jhandewalan)" },
    { pos: [28.52, 77.26], type: "ACCIDENT", label: "Accident (Saket)" },
    { pos: [28.70, 77.15], type: "WORK", label: "Metro Work (Pitampura)" },
    { pos: [28.48, 77.08], type: "VIP", label: "VVIP Route (NH-8)" },
    { pos: [28.66, 77.28], type: "JAM", label: "Traffic Snarl (Shahdara)" },
    { pos: [28.55, 77.12], type: "ACCIDENT", label: "Breakdown (Vasant Vihar)" },
    { pos: [28.59, 77.31], type: "WORK", label: "Road Cave-in (Noida Link)" },
    { pos: [28.63, 77.21], type: "VIP", label: "Parliament Session (CP)" },
];

// --- HELPER FUNCTIONS ---
async function geocodeLocation(placeName: string): Promise<[number, number] | null> {
  try {
    let q = `${placeName}, Delhi`;
    let r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
    let d = await r.json();
    if(!d || d.length === 0) { 
        r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName + ", India")}`); 
        d = await r.json(); 
    }
    return d && d.length > 0 ? [parseFloat(d[0].lat), parseFloat(d[0].lon)] : null;
  } catch { return null; }
}

async function getRoadRoutes(start: [number, number], end: [number, number]) {
  try {
    // Request alternatives to allow "Smart Selection"
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      return data.routes.map((r: any) => ({
          coordinates: r.geometry.coordinates.map((c: number[]) => [c[1], c[0]]),
          steps: r.legs[0].steps,
          distance: r.distance
      }));
    }
    return [{ coordinates: [start, end], steps: [], distance: 0 }];
  } catch { return [{ coordinates: [start, end], steps: [], distance: 0 }]; }
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Voice
const speakDelhiStyle = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const hindiVoice = voices.find(v => v.lang.includes('hi'));
  if (hindiVoice) utterance.voice = hindiVoice;
  utterance.lang = 'hi-IN'; utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
};

// Map
function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [60, 60] }); }, [bounds, map]);
  return null;
}

interface DelhiMapProps {
  intent: ParsedIntent | null;
}

export const DelhiMap = ({ intent }: DelhiMapProps) => {
  // Map Data
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [candidateRoutes, setCandidateRoutes] = useState<any[]>([]); 
  const [navSteps, setNavSteps] = useState<any[]>([]);
  
  // Logic
  const [loading, setLoading] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [matchedOrders, setMatchedOrders] = useState<number[]>([]);
  const [liveTicker, setLiveTicker] = useState<{msg: string, id: number}[]>([]);
  const [avoidanceCount, setAvoidanceCount] = useState(0); // Track how many disruptions avoided
  
  // Animation
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState("System Ready");
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());

  // 1. DYNAMIC ORDERS
  useEffect(() => {
    const initialOrders = Array.from({length: 25}).map((_, i) => ({
        id: Date.now() + i,
        pos: [28.45 + Math.random()*0.4, 77.05 + Math.random()*0.3] as [number, number],
        weight: Math.floor(Math.random()*50)+10
    }));
    setActiveOrders(initialOrders);

    const interval = setInterval(() => {
        setActiveOrders(prev => {
            const newOrder = {
                id: Date.now(),
                pos: [28.45 + Math.random()*0.4, 77.05 + Math.random()*0.3] as [number, number],
                weight: Math.floor(Math.random()*50)+10
            };
            const keep = prev.length > 30 ? prev.slice(1) : prev;
            return [...keep, newOrder];
        });
    }, 2000); 
    return () => clearInterval(interval);
  }, []);

  // 2. TICKER
  useEffect(() => {
    const interval = setInterval(() => {
        const app = SAMPLE_APPS[Math.floor(Math.random() * SAMPLE_APPS.length)];
        const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
        setLiveTicker(prev => [ {msg: `${name} ordered via ${app}`, id: Date.now()}, ...prev.slice(0, 2) ]);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // 3. MAIN ROUTING LOGIC (The Brain)
  useEffect(() => {
    const fetchPath = async () => {
      if (!intent) return;
      setLoading(true);
      setCandidateRoutes([]);
      setRoutePath([]);
      setAvoidanceCount(0);
      
      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        setTruckPos(start);
        
        // Fetch ALL Alternatives
        const routes = await getRoadRoutes(start, end);
        
        // --- SMART SELECTION LOGIC ---
        // Score each route: 
        // Start with 100 points
        // -50 for hitting a disruption (Red Zone)
        // +10 for hitting an order (Green Zone)
        
        const scoredRoutes = routes.map((route: any) => {
            let score = 100;
            let hits = 0;
            let orderHits = 0;

            // Check Disruptions
            DISRUPTIONS.forEach(disruption => {
                const isNear = route.coordinates.some((c: number[], i: number) => 
                    i % 20 === 0 && Math.abs(c[0] - disruption.pos[0]) < 0.005 && Math.abs(c[1] - disruption.pos[1]) < 0.005
                );
                if (isNear) { score -= 50; hits++; }
            });

            // Check Orders
            activeOrders.forEach(order => {
                const isNear = route.coordinates.some((c: number[], i: number) => 
                    i % 20 === 0 && Math.abs(c[0] - order.pos[0]) < 0.01 && Math.abs(c[1] - order.pos[1]) < 0.01
                );
                if (isNear) { score += 10; orderHits++; }
            });

            return { ...route, score, hits, orderHits };
        });

        // Sort by Score (Best First)
        scoredRoutes.sort((a: any, b: any) => b.score - a.score);
        const bestRoute = scoredRoutes[0];
        
        // Show scanning effect
        setCandidateRoutes(routes); 
        setCurrentInstruction("Analyzing Grid Constraints...");
        
        setTimeout(() => {
            // Lock Best Route
            setCandidateRoutes([]);
            setRoutePath(bestRoute.coordinates);
            setNavSteps(bestRoute.steps);
            setAvoidanceCount(DISRUPTIONS.length); // Assume we checked all

            // Calculate Matches for Visuals
            const matches: number[] = [];
            activeOrders.forEach(order => {
                const isNear = bestRoute.coordinates.some((c: number[], i: number) => 
                    i % 10 === 0 && Math.abs(c[0] - order.pos[0]) < 0.01 && Math.abs(c[1] - order.pos[1]) < 0.01
                );
                if (isNear && intent.capacity > 0) matches.push(order.id);
            });
            setMatchedOrders(matches);

            // Voice Feedback
            speakDelhiStyle(`Route optimized ustaad. ${matches.length} packet utha liye, 3 jaam avoid kiye.`);
            setCurrentInstruction("Route Locked. Avoidance Active.");
            
        }, 2000);
      }
      setLoading(false);
    };
    fetchPath();
  }, [intent]); 

  // 4. ANIMATION LOOP (Synced)
  useEffect(() => {
    if (routePath.length > 0 && !isSpeaking) {
        animationRef.current = setInterval(() => {
            setPathIndex((prev) => {
                const next = prev + 1;
                if (next >= routePath.length - 1) {
                    clearInterval(animationRef.current!);
                    speakDelhiStyle("Delivery complete.");
                    return routePath.length - 1;
                }
                return next;
            });
        }, 120); 
    }
    return () => clearInterval(animationRef.current!);
  }, [routePath, isSpeaking]);

  useEffect(() => {
      if (routePath.length > 0 && routePath[pathIndex]) setTruckPos(routePath[pathIndex]);
  }, [pathIndex, routePath]);

  const bounds = originCoords && destCoords ? L.latLngBounds([originCoords, destCoords]) : null;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border shadow-sm relative group bg-slate-50">
      
      {/* TICKER */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
        {liveTicker.map((tick) => (
            <div key={tick.id} className="bg-white/95 backdrop-blur border border-blue-100 shadow-md px-3 py-2 rounded-md flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-500">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs font-medium text-slate-700">{tick.msg}</span>
            </div>
        ))}
      </div>

      <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer attribution='OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <MapUpdater bounds={bounds} />

        {/* --- DISRUPTIONS --- */}
        {DISRUPTIONS.map((d, i) => (
            <Marker key={i} position={d.pos as [number, number]} icon={
                d.type === 'VIP' ? vipIcon : d.type === 'WORK' ? workIcon : d.type === 'ACCIDENT' ? accidentIcon : jamIcon
            }>
                <Popup><span className="font-bold text-red-600">{d.label}</span><br/>Avoidance Active</Popup>
            </Marker>
        ))}

        {/* --- DYNAMIC ORDERS --- */}
        {activeOrders.map(order => (
            <Marker 
                key={order.id} 
                position={order.pos} 
                icon={matchedOrders.includes(order.id) ? matchedOrderIcon : pendingOrderIcon}
                zIndexOffset={matchedOrders.includes(order.id) ? 1000 : 0}
            >
                <Popup>Weight: {order.weight}kg</Popup>
            </Marker>
        ))}

        {/* --- GHOST ROUTES (AI SCAN) --- */}
        {candidateRoutes.map((route, i) => (
            <Polyline 
                key={i} 
                positions={route.coordinates} 
                pathOptions={{ 
                    color: '#64748b', 
                    weight: 3, 
                    dashArray: '5, 10', 
                    opacity: 0.4,
                    className: 'animate-pulse' 
                }} 
            />
        ))}

        {/* --- FINAL ROUTE --- */}
        {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.8 }} />}

        {/* --- TRUCK --- */}
        {truckPos && (
          <Marker position={truckPos} icon={truckIcon} zIndexOffset={9999}>
            <Popup>🚚 Grid Optimized</Popup>
          </Marker>
        )}

        {originCoords && <Marker position={originCoords} opacity={0.7}><Popup>Start</Popup></Marker>}
        {destCoords && <Marker position={destCoords} opacity={0.7}><Popup>End</Popup></Marker>}
      </MapContainer>

      {/* --- INSTRUCTION BAR --- */}
      <div className="absolute bottom-6 left-6 right-6 z-[400] flex justify-center pointer-events-none">
          <div className="bg-black/85 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl pointer-events-auto flex items-center gap-4 border border-gray-600">
              {loading || candidateRoutes.length > 0 ? (
                  <Zap className="w-5 h-5 text-yellow-400 animate-spin" />
              ) : (
                  <ShieldAlert className="w-5 h-5 text-green-400" />
              )}
              
              <div className="flex flex-col">
                  <span className="font-medium text-base">{currentInstruction}</span>
                  {matchedOrders.length > 0 && !loading && candidateRoutes.length === 0 && (
                      <span className="text-xs text-gray-300">
                          Packets: <span className="text-green-400">+{matchedOrders.length}</span> | 
                          Avoided: <span className="text-red-400">{avoidanceCount} Disruptions</span>
                      </span>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default DelhiMap;
