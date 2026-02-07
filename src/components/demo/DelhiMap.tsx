import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Volume2, VolumeX, Navigation, Warehouse, PackageCheck } from "lucide-react"; 
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ParsedIntent } from "./VoiceInputPanel";

// --- ICONS SETUP ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// 1. TRUCK ICON
const truckIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #2563eb; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-size: 22px;">🚛</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// 2. ORDER ICONS
const pendingOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #f97316; width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; opacity: 0.6;"></div>`,
  iconSize: [10, 10]
});

const matchedOrderIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: bold; box-shadow: 0 0 10px #22c55e;">📦</div>`,
  iconSize: [16, 16]
});

// 3. GODOWN (MICRO-HUB) ICONS
const godownIconDefault = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #475569; width: 18px; height: 18px; border-radius: 4px; border: 1px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; opacity: 0.7;">🏠</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const godownIconActive = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #9333ea; width: 32px; height: 32px; border-radius: 6px; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; box-shadow: 0 0 15px #9333ea; animation: pulse 2s infinite;">🏭</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// --- GENERATORS ---

// Generate 50+ Godowns all over Delhi
const generateDenseHubs = (count: number) => {
    const minLat = 28.48, maxLat = 28.75;
    const minLng = 77.08, maxLng = 77.32;
    const types = ["Old Godown", "Kirana Store", "Empty Basement", "Ind. Shed", "Metro Locker"];
    
    return Array.from({length: count}).map((_, i) => ({
        id: `h${i}`,
        name: `${types[Math.floor(Math.random() * types.length)]} #${i+100}`,
        pos: [Math.random() * (maxLat - minLat) + minLat, Math.random() * (maxLng - minLng) + minLng] as [number, number],
        capacity: Math.floor(Math.random() * 500) + 100 // Sq ft
    }));
};

const generateRandomOrders = (count: number) => {
    const minLat = 28.45, maxLat = 28.85;
    const minLng = 77.05, maxLng = 77.35;
    return Array.from({length: count}).map((_, i) => ({
        id: i,
        pos: [Math.random() * (maxLat - minLat) + minLat, Math.random() * (maxLng - minLng) + minLng] as [number, number],
        weight: Math.floor(Math.random()*50)+10
    }));
};

// --- API HELPERS ---
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

async function getRoadRouteWithSteps(start: [number, number], end: [number, number]) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
      const steps = data.routes[0].legs[0].steps; 
      return { coordinates, steps };
    }
    return { coordinates: [start, end], steps: [] };
  } catch { return { coordinates: [start, end], steps: [] }; }
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- AUDIO PLAYER ---
const playNeuralVoice = async (text: string, onEnd: () => void) => {
    try {
        const response = await fetch("https://delhi-logistics-protocol.onrender.com/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error("Audio gen failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = onEnd;
        audio.play();
    } catch (e) {
        console.error("Audio failed", e);
        onEnd(); 
    }
};

const getInstructionSlang = (modifier: string, type: string) => {
    if (type === 'arrive') return "Bas pahunch gaye ustaad. Gaadi side laga lo.";
    if (modifier?.includes('left')) return "Ustaad, aage se Left le lena.";
    if (modifier?.includes('right')) return "Bhai, Right ka cut maaro.";
    return "Seedha kheecho, rasta saaf hai.";
};

function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [50, 50] }); }, [bounds, map]);
  return null;
}

interface DelhiMapProps {
  intent: ParsedIntent | null;
}

export const DelhiMap = ({ intent }: DelhiMapProps) => {
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [navSteps, setNavSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentInstruction, setCurrentInstruction] = useState("Route Calculating...");
  const [matchedOrders, setMatchedOrders] = useState<number[]>([]);
  const [activeHubs, setActiveHubs] = useState<string[]>([]);
  
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());
  const spokenHubs = useRef<Set<string>>(new Set());

  // GENERATE 30 ORDERS & 60 GODOWNS
  const allOrders = useMemo(() => generateRandomOrders(30), []);
  const allHubs = useMemo(() => generateDenseHubs(60), []);

  // 1. INITIALIZE ROUTE
  useEffect(() => {
    const fetchPath = async () => {
      if (!intent) return;
      setLoading(true);
      spokenSteps.current.clear();
      spokenHubs.current.clear();
      setPathIndex(0);
      setIsSpeaking(false);
      setMatchedOrders([]);
      setActiveHubs([]);

      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        setTruckPos(start);
        
        const { coordinates, steps } = await getRoadRouteWithSteps(start, end);
        setRoutePath(coordinates);
        setNavSteps(steps);

        // A. MATCH ORDERS (Proximity: 1.0 km)
        const matches: number[] = [];
        if (intent.capacity > 0) {
            allOrders.forEach(order => {
                let isNear = false;
                for (let i = 0; i < coordinates.length; i += 10) {
                    if (getDistanceFromLatLonInKm(order.pos[0], order.pos[1], coordinates[i][0], coordinates[i][1]) < 1.0) {
                        isNear = true; break;
                    }
                }
                if (isNear) matches.push(order.id);
            });
        }
        setMatchedOrders(matches);

        // B. MATCH GODOWNS (Proximity: 1.5 km)
        const matchedHubsList: string[] = [];
        allHubs.forEach(hub => {
            let isNear = false;
            for (let i = 0; i < coordinates.length; i += 10) {
                if (getDistanceFromLatLonInKm(hub.pos[0], hub.pos[1], coordinates[i][0], coordinates[i][1]) < 1.5) {
                    isNear = true; break;
                }
            }
            if (isNear) matchedHubsList.push(hub.id);
        });
        setActiveHubs(matchedHubsList);

        // C. INITIAL VOICE
        if (soundEnabled) {
            setIsSpeaking(true);
            const hubMsg = matchedHubsList.length > 0 ? `${matchedHubsList.length} Godowns mil gaye raaste mein.` : "";
            playNeuralVoice(`Chalo ustaad, route set hai. ${hubMsg}`, () => {
                setIsSpeaking(false);
            });
        }
      }
      setLoading(false);
    };
    fetchPath();
  }, [intent, allOrders, allHubs]);

  // 2. ANIMATION & EVENTS
  useEffect(() => {
    if (routePath.length > 0 && !isSpeaking) {
        animationRef.current = setInterval(() => {
            setPathIndex((prev) => {
                const next = prev + 1;
                const currentLoc = routePath[next];
                
                // --- HUB PROXIMITY CHECK (Dynamic Voice) ---
                if (currentLoc) {
                    // Only check active hubs
                    const nearbyHubId = activeHubs.find(id => {
                        const hub = allHubs.find(h => h.id === id);
                        return hub && getDistanceFromLatLonInKm(currentLoc[0], currentLoc[1], hub.pos[0], hub.pos[1]) < 0.3; // 300m trigger
                    });

                    if (nearbyHubId && !spokenHubs.current.has(nearbyHubId)) {
                        const hub = allHubs.find(h => h.id === nearbyHubId);
                        clearInterval(animationRef.current!);
                        setIsSpeaking(true);
                        spokenHubs.current.add(nearbyHubId);
                        
                        const msg = `Ustaad, yahan ${hub?.name} hai. Load drop kar do.`;
                        setCurrentInstruction(`Drop at ${hub?.name}`);
                        
                        if(soundEnabled) {
                            playNeuralVoice(msg, () => setIsSpeaking(false));
                        } else {
                            setTimeout(() => setIsSpeaking(false), 2000);
                        }
                    }
                }

                // --- TURN CHECK ---
                const progress = next / routePath.length;
                const stepIndex = Math.floor(progress * navSteps.length);
                
                if (navSteps[stepIndex] && !spokenSteps.current.has(stepIndex)) {
                    const step = navSteps[stepIndex];
                    const maneuver = step.maneuver;
                    if (maneuver.type !== 'depart' && maneuver.modifier) {
                        clearInterval(animationRef.current!);
                        setIsSpeaking(true);
                        const slang = getInstructionSlang(maneuver.modifier, maneuver.type);
                        setCurrentInstruction(slang);
                        spokenSteps.current.add(stepIndex);
                        if (soundEnabled) playNeuralVoice(slang, () => setIsSpeaking(false));
                        else setTimeout(() => setIsSpeaking(false), 2000);
                        return prev;
                    }
                }

                if (next >= routePath.length - 1) {
                    clearInterval(animationRef.current!);
                    if (soundEnabled) playNeuralVoice("Pahunch gaye ustaad. Delivery complete.", () => {});
                    return routePath.length - 1;
                }
                return next;
            });
        }, 100); 
    }
    return () => { if (animationRef.current) clearInterval(animationRef.current); };
  }, [routePath, isSpeaking, navSteps, soundEnabled, activeHubs, allHubs]);

  useEffect(() => {
      if (routePath.length > 0 && routePath[pathIndex]) {
          setTruckPos(routePath[pathIndex]);
      }
  }, [pathIndex, routePath]);

  const bounds = originCoords && destCoords ? L.latLngBounds([originCoords, destCoords]) : null;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border shadow-sm relative group">
      <button onClick={() => setSoundEnabled(!soundEnabled)} className="absolute top-4 left-14 z-[400] bg-white p-2 rounded-md shadow-md hover:bg-gray-50">
        {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
      </button>

      <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer attribution='OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <MapUpdater bounds={bounds} />
        
        {/* GODOWNS LAYER */}
        {allHubs.map(hub => {
            const isActive = activeHubs.includes(hub.id);
            return (
                <Marker 
                    key={hub.id} 
                    position={hub.pos} 
                    icon={isActive ? godownIconActive : godownIconDefault}
                    zIndexOffset={isActive ? 1500 : 200}
                >
                    {isActive && <Popup><strong>{hub.name}</strong><br/>Capacity: {hub.capacity} sqft</Popup>}
                </Marker>
            );
        })}

        {/* ORDERS LAYER */}
        {allOrders.map(order => (
            <Marker 
                key={order.id} 
                position={order.pos} 
                icon={matchedOrders.includes(order.id) ? matchedOrderIcon : pendingOrderIcon} 
                zIndexOffset={matchedOrders.includes(order.id) ? 1000 : 0}
            />
        ))}

        {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.6 }} />}
        
        {truckPos && (
          <Marker position={truckPos} icon={truckIcon} zIndexOffset={9999}>
            <Popup>{isSpeaking ? "🔊 Listening..." : "🚚 Moving..."}</Popup>
          </Marker>
        )}
        
        {originCoords && <Marker position={originCoords}><Popup>Origin</Popup></Marker>}
        {destCoords && <Marker position={destCoords}><Popup>Dest</Popup></Marker>}
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[500] flex items-center justify-center">
            <span className="font-bold text-blue-900 animate-pulse">Calculating Route...</span>
        </div>
      )}

      {!loading && routePath.length > 0 && (
          <div className="absolute bottom-6 left-6 right-6 z-[400] flex justify-center pointer-events-none">
              <div className="bg-black/80 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl pointer-events-auto flex items-center gap-3 border border-gray-600">
                  {isSpeaking ? <Volume2 className="w-5 h-5 text-green-400 animate-pulse" /> : <Navigation className="w-5 h-5 text-gray-400" />}
                  <div className="flex flex-col">
                      <span className="font-medium text-lg leading-none">{currentInstruction}</span>
                      <div className="flex gap-3 text-xs text-gray-300 mt-1">
                          {matchedOrders.length > 0 && <span>📦 +{matchedOrders.length} Pickups</span>}
                          {activeHubs.length > 0 && <span className="text-purple-300">🏭 +{activeHubs.length} Hub Drops</span>}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DelhiMap;
