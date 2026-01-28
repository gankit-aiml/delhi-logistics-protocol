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

// --- DYNAMIC TRUCK ICON CREATOR ---
// The emoji 🚚 faces LEFT by default.
// If heading is between 0-180 (East-ish), we flip it.
const createTruckIcon = (bearing: number) => {
  // Determine if we need to flip the image (Mirror)
  // Bearing 0 = North, 90 = East, 180 = South, 270 = West
  // If moving East (Right), we need to flip the Left-facing emoji.
  const shouldFlip = bearing > 0 && bearing < 180;
  
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="
        background-color: #2563eb; 
        width: 40px; height: 40px; 
        border-radius: 50%; 
        border: 3px solid white; 
        display: flex; align-items: center; justify-content: center; 
        box-shadow: 0 4px 10px rgba(0,0,0,0.4); 
        font-size: 22px; 
        transition: transform 0.3s ease;
        transform: ${shouldFlip ? 'scaleX(-1)' : 'scaleX(1)'};
    ">🚚</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

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
    let q = `${placeName}, Delhi`;
    let r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
    let d = await r.json();
    if (!data || data.length === 0) {
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

const generateRandomOrders = (count: number) => {
    const minLat = 28.45, maxLat = 28.85;
    const minLng = 77.05, maxLng = 77.35;
    return Array.from({length: count}).map((_, i) => ({
        id: i,
        pos: [Math.random() * (maxLat - minLat) + minLat, Math.random() * (maxLng - minLng) + minLng] as [number, number],
        weight: Math.floor(Math.random()*50)+10
    }));
};

// --- MATH HELPERS ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calculate Bearing (Direction) between two points
function getBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const startLatRad = startLat * (Math.PI / 180);
  const startLngRad = startLng * (Math.PI / 180);
  const destLatRad = destLat * (Math.PI / 180);
  const destLngRad = destLng * (Math.PI / 180);

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  
  let brng = Math.atan2(y, x);
  brng = brng * (180 / Math.PI);
  return (brng + 360) % 360; // Normalize to 0-360
}

// --- AUDIO ---
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
  
  // Animation
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [truckBearing, setTruckBearing] = useState(0); // Store direction
  const [pathIndex, setPathIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());

  const allOrders = useMemo(() => generateRandomOrders(30), []);

  useEffect(() => {
    const fetchPath = async () => {
      if (!intent) return;
      setLoading(true);
      spokenSteps.current.clear();
      setPathIndex(0);
      setIsSpeaking(false);
      setMatchedOrders([]);

      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        setTruckPos(start);
        setTruckBearing(0); // Reset bearing
        
        const { coordinates, steps } = await getRoadRouteWithSteps(start, end);
        setRoutePath(coordinates);
        setNavSteps(steps);

        // Matching Logic
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

        if (soundEnabled) {
            setIsSpeaking(true);
            playNeuralVoice(`Chalo ustaad, ${intent.origin} se ${intent.destination} ka route set hai.`, () => setIsSpeaking(false));
        }
      }
      setLoading(false);
    };
    fetchPath();
  }, [intent, allOrders]);

  // Animation Loop
  useEffect(() => {
    if (routePath.length > 0 && !isSpeaking) {
        animationRef.current = setInterval(() => {
            setPathIndex((prev) => {
                const next = prev + 1;
                
                // CALCULATE BEARING (For Truck Rotation)
                if (routePath[next] && routePath[prev]) {
                    const bearing = getBearing(
                        routePath[prev][0], routePath[prev][1],
                        routePath[next][0], routePath[next][1]
                    );
                    setTruckBearing(bearing);
                }

                // NAVIGATION LOGIC
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

                        if (soundEnabled) {
                            playNeuralVoice(slang, () => setIsSpeaking(false));
                        } else {
                            setTimeout(() => setIsSpeaking(false), 2000);
                        }
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
    return () => {
        if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [routePath, isSpeaking, navSteps, soundEnabled]);

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
        
        {allOrders.map(order => (
            <Marker key={order.id} position={order.pos} icon={matchedOrders.includes(order.id) ? matchedOrderIcon : pendingOrderIcon} zIndexOffset={matchedOrders.includes(order.id) ? 1000 : 0}>
                <Popup>Weight: {order.weight}kg</Popup>
            </Marker>
        ))}

        {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.6 }} />}
        
        {/* MOVING TRUCK - NOW WITH DYNAMIC ROTATION */}
        {truckPos && (
          <Marker 
            position={truckPos} 
            icon={createTruckIcon(truckBearing)} 
            zIndexOffset={9999}
          >
            <Popup>{isSpeaking ? "🔊 Ustaad Listening..." : "🚚 Moving..."}</Popup>
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
                  <span className="font-medium text-lg">{currentInstruction}</span>
              </div>
          </div>
      )}
    </div>
  );
};

export default DelhiMap;
