export const TechnicalArchitectureDiagram = () => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <svg viewBox="0 0 800 320" className="w-full h-auto" aria-labelledby="tech-arch-title">
        <title id="tech-arch-title">DLPP Technical Architecture</title>
        
        {/* Component boxes */}
        <g>
          {/* Voice Intake */}
          <rect x="30" y="50" width="120" height="60" rx="4" className="fill-primary/10 stroke-primary" strokeWidth="2" />
          <text x="90" y="75" textAnchor="middle" className="fill-primary text-xs font-semibold">Voice Intake</text>
          <text x="90" y="90" textAnchor="middle" className="fill-primary/70 text-[10px]">Service</text>
        </g>
        
        <g>
          {/* Intent Parsing */}
          <rect x="180" y="50" width="120" height="60" rx="4" className="fill-primary/10 stroke-primary" strokeWidth="2" />
          <text x="240" y="75" textAnchor="middle" className="fill-primary text-xs font-semibold">Intent Parsing</text>
          <text x="240" y="90" textAnchor="middle" className="fill-primary/70 text-[10px]">Module</text>
        </g>
        
        <g>
          {/* Coordination Engine */}
          <rect x="330" y="50" width="140" height="60" rx="4" className="fill-matched/10 stroke-matched" strokeWidth="2" />
          <text x="400" y="75" textAnchor="middle" className="fill-matched text-xs font-semibold">Coordination &</text>
          <text x="400" y="90" textAnchor="middle" className="fill-matched text-xs font-semibold">Matching Engine</text>
        </g>
        
        <g>
          {/* Simulation Layer */}
          <rect x="500" y="50" width="120" height="60" rx="4" className="fill-driver/10 stroke-driver" strokeWidth="2" />
          <text x="560" y="75" textAnchor="middle" className="fill-driver text-xs font-semibold">Simulation</text>
          <text x="560" y="90" textAnchor="middle" className="fill-driver/70 text-[10px]">Layer</text>
        </g>
        
        <g>
          {/* Visualization */}
          <rect x="650" y="50" width="120" height="60" rx="4" className="fill-route/10 stroke-route" strokeWidth="2" />
          <text x="710" y="75" textAnchor="middle" className="fill-route text-xs font-semibold">Visualization</text>
          <text x="710" y="90" textAnchor="middle" className="fill-route/70 text-[10px]">Interface</text>
        </g>
        
        {/* Arrows */}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground" />
          </marker>
        </defs>
        
        <line x1="150" y1="80" x2="175" y2="80" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-muted-foreground" />
        <line x1="300" y1="80" x2="325" y2="80" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-muted-foreground" />
        <line x1="470" y1="80" x2="495" y2="80" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-muted-foreground" />
        <line x1="620" y1="80" x2="645" y2="80" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-muted-foreground" />
        
        {/* Data stores */}
        <rect x="330" y="150" width="140" height="40" rx="4" className="fill-muted stroke-border" strokeWidth="1" />
        <text x="400" y="175" textAnchor="middle" className="fill-muted-foreground text-xs">Demand Signals Store</text>
        
        <rect x="500" y="150" width="120" height="40" rx="4" className="fill-muted stroke-border" strokeWidth="1" />
        <text x="560" y="175" textAnchor="middle" className="fill-muted-foreground text-xs">Route Data</text>
        
        {/* Vertical connections */}
        <line x1="400" y1="110" x2="400" y2="145" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-border" />
        <line x1="560" y1="110" x2="560" y2="145" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-border" />
        
        {/* Labels */}
        <text x="400" y="230" textAnchor="middle" className="fill-foreground text-sm font-medium">Phase-0 / Phase-1 Conceptual Architecture</text>
        
        {/* Legend */}
        <g transform="translate(30, 260)">
          <rect x="0" y="0" width="12" height="12" rx="2" className="fill-primary/20 stroke-primary" strokeWidth="1" />
          <text x="20" y="10" className="fill-muted-foreground text-[10px]">Input Processing</text>
          
          <rect x="130" y="0" width="12" height="12" rx="2" className="fill-matched/20 stroke-matched" strokeWidth="1" />
          <text x="150" y="10" className="fill-muted-foreground text-[10px]">Core Logic</text>
          
          <rect x="240" y="0" width="12" height="12" rx="2" className="fill-driver/20 stroke-driver" strokeWidth="1" />
          <text x="260" y="10" className="fill-muted-foreground text-[10px]">Simulation</text>
          
          <rect x="340" y="0" width="12" height="12" rx="2" className="fill-route/20 stroke-route" strokeWidth="1" />
          <text x="360" y="10" className="fill-muted-foreground text-[10px]">Output</text>
        </g>
      </svg>
    </div>
  );
};

export default TechnicalArchitectureDiagram;
