import { useState, useEffect } from "react";
import type { ParsedIntent } from "./VoiceInputPanel";

// Delhi locations with relative positions on the map (0-100 scale)
const LOCATIONS: Record<string, { x: number; y: number }> = {
  "Connaught Place": { x: 50, y: 42 },
  "Karol Bagh": { x: 42, y: 35 },
  "Saket": { x: 48, y: 70 },
  "Dwarka": { x: 15, y: 52 },
  "Rohini": { x: 38, y: 15 },
  "Lajpat Nagar": { x: 55, y: 58 },
  "Nehru Place": { x: 58, y: 62 },
  "Okhla": { x: 62, y: 72 },
  "Noida": { x: 78, y: 55 },
  "Gurgaon": { x: 22, y: 80 },
  "Gurugram": { x: 22, y: 80 },
  "Janakpuri": { x: 25, y: 48 },
  "Pitampura": { x: 42, y: 22 },
  "Vasant Kunj": { x: 35, y: 72 },
  "Mayur Vihar": { x: 68, y: 48 },
  "Chandni Chowk": { x: 52, y: 35 },
  "Old Delhi": { x: 54, y: 32 },
  "New Delhi": { x: 50, y: 50 },
  "India Gate": { x: 55, y: 48 },
};

// Pre-fed delivery orders
const DELIVERY_ORDERS = [
  { id: 1, location: "Saket", weight: 15 },
  { id: 2, location: "Lajpat Nagar", weight: 20 },
  { id: 3, location: "Nehru Place", weight: 10 },
  { id: 4, location: "Dwarka", weight: 25 },
  { id: 5, location: "Rohini", weight: 30 },
  { id: 6, location: "Vasant Kunj", weight: 18 },
];

interface DelhiMapProps {
  intent: ParsedIntent | null;
}

export const DelhiMap = ({ intent }: DelhiMapProps) => {
  const [matchedOrders, setMatchedOrders] = useState<number[]>([]);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (!intent) {
      setMatchedOrders([]);
      setAnimationProgress(0);
      return;
    }

    // Animate truck along route
    setAnimationProgress(0);
    const timer = setInterval(() => {
      setAnimationProgress((prev) => {
        if (prev >= 1) {
          clearInterval(timer);
          return 1;
        }
        return prev + 0.02;
      });
    }, 50);

    // Find matching orders
    const originPos = LOCATIONS[intent.origin];
    const destPos = LOCATIONS[intent.destination];
    
    if (!originPos || !destPos) return;

    const matched: number[] = [];
    let usedCapacity = 0;

    DELIVERY_ORDERS.forEach((order) => {
      const orderPos = LOCATIONS[order.location];
      if (!orderPos) return;

      // Check if order is along the route (simple proximity check)
      const routeMinX = Math.min(originPos.x, destPos.x) - 10;
      const routeMaxX = Math.max(originPos.x, destPos.x) + 10;
      const routeMinY = Math.min(originPos.y, destPos.y) - 10;
      const routeMaxY = Math.max(originPos.y, destPos.y) + 10;

      const isAlongRoute = 
        orderPos.x >= routeMinX && orderPos.x <= routeMaxX &&
        orderPos.y >= routeMinY && orderPos.y <= routeMaxY;

      if (isAlongRoute && usedCapacity + order.weight <= intent.capacity) {
        matched.push(order.id);
        usedCapacity += order.weight;
      }
    });

    setMatchedOrders(matched);

    return () => clearInterval(timer);
  }, [intent]);

  const originPos = intent ? LOCATIONS[intent.origin] : null;
  const destPos = intent ? LOCATIONS[intent.destination] : null;

  // Calculate truck position along route
  const truckPos = originPos && destPos ? {
    x: originPos.x + (destPos.x - originPos.x) * animationProgress,
    y: originPos.y + (destPos.y - originPos.y) * animationProgress,
  } : null;

  return (
    <div className="h-full w-full relative rounded-md overflow-hidden border border-border bg-muted/30">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(var(--border))" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />

        {/* Delhi outline (simplified) */}
        <path
          d="M 10 40 Q 15 20 40 15 Q 60 10 75 25 Q 85 40 80 60 Q 75 80 55 88 Q 35 92 20 80 Q 8 65 10 40 Z"
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
        />

        {/* Route line */}
        {originPos && destPos && (
          <line
            x1={originPos.x}
            y1={originPos.y}
            x2={destPos.x}
            y2={destPos.y}
            stroke="hsl(var(--primary))"
            strokeWidth="0.8"
            strokeDasharray="2,1"
            opacity="0.7"
          />
        )}

        {/* Delivery orders */}
        {DELIVERY_ORDERS.map((order) => {
          const pos = LOCATIONS[order.location];
          if (!pos) return null;
          const isMatched = matchedOrders.includes(order.id);

          return (
            <g key={order.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isMatched ? 2.5 : 2}
                fill={isMatched ? "hsl(var(--success))" : "hsl(var(--warning))"}
                stroke={isMatched ? "hsl(var(--success))" : "hsl(var(--warning))"}
                strokeWidth="0.5"
                opacity={isMatched ? 1 : 0.7}
              />
              {isMatched && (
                <text
                  x={pos.x}
                  y={pos.y + 0.5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2"
                  fontWeight="bold"
                >
                  ✓
                </text>
              )}
            </g>
          );
        })}

        {/* Origin marker */}
        {originPos && (
          <g>
            <circle
              cx={originPos.x}
              cy={originPos.y}
              r="3"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="0.5"
            />
            <text
              x={originPos.x}
              y={originPos.y - 5}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="2.5"
              fontWeight="600"
            >
              {intent?.origin}
            </text>
          </g>
        )}

        {/* Destination marker */}
        {destPos && (
          <g>
            <rect
              x={destPos.x - 2}
              y={destPos.y - 2}
              width="4"
              height="4"
              fill="hsl(var(--destructive))"
              stroke="hsl(var(--destructive-foreground))"
              strokeWidth="0.3"
              rx="0.5"
            />
            <text
              x={destPos.x}
              y={destPos.y - 5}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="2.5"
              fontWeight="600"
            >
              {intent?.destination}
            </text>
          </g>
        )}

        {/* Truck */}
        {truckPos && intent && (
          <g transform={`translate(${truckPos.x - 3}, ${truckPos.y - 2})`}>
            {/* Truck body */}
            <rect x="0" y="0" width="6" height="4" rx="0.5" fill="hsl(var(--primary))" />
            {/* Capacity fill */}
            <rect 
              x="0.5" 
              y={4 - (intent.capacity / 100) * 3} 
              width="5" 
              height={(intent.capacity / 100) * 3} 
              fill="hsl(var(--success))" 
              opacity="0.7"
              rx="0.3"
            />
            {/* Wheels */}
            <circle cx="1.5" cy="4.5" r="0.8" fill="hsl(var(--foreground))" />
            <circle cx="4.5" cy="4.5" r="0.8" fill="hsl(var(--foreground))" />
          </g>
        )}

        {/* Location labels (static) */}
        {Object.entries(LOCATIONS).slice(0, 8).map(([name, pos]) => (
          <text
            key={name}
            x={pos.x}
            y={pos.y + 4}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="1.8"
            opacity="0.6"
          >
            {name}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 border border-border rounded-md p-3 text-xs">
        <p className="font-semibold mb-2">Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span>Delivery Order</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>Matched Order</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Origin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-destructive"></div>
            <span>Destination</span>
          </div>
        </div>
      </div>

      {/* Matched Orders Info */}
      {matchedOrders.length > 0 && (
        <div className="absolute top-4 right-4 bg-background/95 border border-border rounded-md p-3 text-xs">
          <p className="font-semibold text-success mb-1">
            {matchedOrders.length} Order{matchedOrders.length > 1 ? "s" : ""} Matched
          </p>
          <p className="text-muted-foreground">
            Orders fit route and capacity
          </p>
        </div>
      )}

      {/* No intent state */}
      {!intent && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-center p-6 bg-background border border-border rounded-md max-w-xs">
            <p className="text-muted-foreground text-sm">
              Use voice input to simulate a driver route
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The map shows Delhi with pre-placed delivery orders
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DelhiMap;