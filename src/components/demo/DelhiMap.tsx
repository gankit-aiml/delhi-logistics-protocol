import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Volume2, VolumeX, Navigation } from "lucide-react"; 
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ParsedIntent } from "./VoiceInputPanel";

// --- ICONS SETUP ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const truckIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #2563eb; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-size: 22px;">🚛</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// --- API HELPERS ---
async function geocodeLocation(placeName: string) { /* ... keep existing geocode logic ... */ 
    // (Pasting simplified version for brevity, use your full version)
    try {
        let q = `${placeName}, Delhi`;
        let r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
        let d = await r.json();
        if(!d.length) { r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${placeName}, India`); d = await r.json(); }
        return d.length ? [parseFloat(d[0].lat), parseFloat(d[0].lon)] : null;
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

const generateRandomOrders = (count: number) => { /* ... keep existing ... */ 
    return Array.from({length: count}).map((_, i) => ({
        id: i,
        pos: [28.45 + Math.random()*0.4, 77.05 + Math.random()*0.3] as [number, number],
        weight: Math.floor(Math.random()*50)+10
    }));
};

// --- NEW AUDIO PLAYER ---
const playNeuralVoice = async (text: string, onEnd: () => void) => {
    try {
        const response = await fetch("https://delhi-logistics-protocol.onrender.com/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = onEnd;
        audio.play();
    } catch (e) {
        console.error("Audio failed", e);
        onEnd(); // Continue even if audio fails
    }
};

const getInstructionSlang = (modifier: string, type: string) => {
    if (type === 'arrive') return "Bas pahunch gaye ustaad. Gaadi side laga lo.";
    if (modifier?.includes('left')) return "Ustaad, aage se Left le lena.";
    if (modifier?.includes('right')) return "Bhai, Right ka cut maaro.";
    return "Seedha kheecho, rasta saaf hai.";
};

// Map Component
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
  
  // Animation Control
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false); // THE SYNC LOCK
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());

  const allOrders = useMemo(() => generateRandomOrders(30), []);

  // 1. INITIALIZE ROUTE
  useEffect(() => {
    const fetchPath = async () => {
      if (!intent) return;
      setLoading(true);
      spokenSteps.current.clear();
      setPathIndex(0);
      setIsSpeaking(false);

      const start = await geocodeLocation(intent.origin);
      const end = await geocodeLocation(intent.destination);

      if (start && end) {
        setOriginCoords(start);
        setDestCoords(end);
        setTruckPos(start);
        
        const { coordinates, steps } = await getRoadRouteWithSteps(start, end);
        setRoutePath(coordinates);
        setNavSteps(steps);

        // Initial Voice
        if (soundEnabled) {
            setIsSpeaking(true); // Pause truck
            playNeuralVoice(`Chalo ustaad, ${intent.origin} se ${intent.destination} ka route set hai.`, () => {
                setIsSpeaking(false); // Resume truck
            });
        }
      }
      setLoading(false);
    };
    fetchPath();
  }, [intent]);

  // 2. THE SYNCED ANIMATION LOOP
  useEffect(() => {
    if (routePath.length > 0 && !isSpeaking) {
        animationRef.current = setInterval(() => {
            setPathIndex((prev) => {
                const next = prev + 1;
                
                // CHECK FOR TURNS
                // We map path progress to steps roughly
                const progress = next / routePath.length;
                const stepIndex = Math.floor(progress * navSteps.length);
                
                // If there is a step here AND we haven't spoken it
                if (navSteps[stepIndex] && !spokenSteps.current.has(stepIndex)) {
                    const step = navSteps[stepIndex];
                    const maneuver = step.maneuver;
                    
                    if (maneuver.type !== 'depart' && maneuver.modifier) {
                        // FOUND A TURN!
                        clearInterval(animationRef.current!); // Stop animation
                        setIsSpeaking(true); // Lock state
                        
                        const slang = getInstructionSlang(maneuver.modifier, maneuver.type);
                        setCurrentInstruction(slang);
                        spokenSteps.current.add(stepIndex); // Mark done

                        if (soundEnabled) {
                            playNeuralVoice(slang, () => {
                                setIsSpeaking(false); // Resume when audio ends
                            });
                        } else {
                            setTimeout(() => setIsSpeaking(false), 2000); // Fake delay if muted
                        }
                        
                        return prev; // Don't move truck while speaking
                    }
                }

                // CHECK ARRIVAL
                if (next >= routePath.length - 1) {
                    clearInterval(animationRef.current!);
                    if (soundEnabled) playNeuralVoice("Pahunch gaye ustaad. Delivery complete.", () => {});
                    return routePath.length - 1;
                }
                return next;
            });
        }, 100); // Speed of truck
    }
    return () => {
        if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [routePath, isSpeaking, navSteps, soundEnabled]);

  // Sync Truck Icon
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
        {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.6 }} />}
        
        {truckPos && (
          <Marker position={truckPos} icon={truckIcon} zIndexOffset={9999}>
            <Popup>
                {isSpeaking ? "🔊 Ustaad Listening..." : "🚚 Moving..."}
            </Popup>
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

      {/* INSTRUCTION BAR */}
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
