export const ArchitectureDiagram = () => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <svg viewBox="0 0 800 400" className="w-full h-auto" aria-labelledby="arch-title arch-desc">
        <title id="arch-title">DLPP Architecture Diagram</title>
        <desc id="arch-desc">High-level structure showing government protocol layer, private app layer, driver interaction, and city systems</desc>
        
        {/* Background layers */}
        <rect x="50" y="30" width="700" height="70" rx="8" className="fill-primary/10 stroke-primary" strokeWidth="2" />
        <rect x="50" y="120" width="700" height="70" rx="8" className="fill-private/10 stroke-private" strokeWidth="2" />
        <rect x="50" y="210" width="340" height="70" rx="8" className="fill-driver/10 stroke-driver" strokeWidth="2" />
        <rect x="410" y="210" width="340" height="70" rx="8" className="fill-city/10 stroke-city" strokeWidth="2" strokeDasharray="8 4" />
        
        {/* Layer labels */}
        <text x="70" y="55" className="fill-primary text-sm font-semibold">Government Protocol Layer</text>
        <text x="70" y="75" className="fill-primary/70 text-xs">DLPP Core — Coordination Rules, APIs, Data Standards</text>
        
        <text x="70" y="145" className="fill-private text-sm font-semibold">Private Application Layer</text>
        <text x="70" y="165" className="fill-private/70 text-xs">Logistics Apps, Aggregators, Fleet Management Systems</text>
        
        <text x="70" y="235" className="fill-driver text-sm font-semibold">Driver Interaction</text>
        <text x="70" y="255" className="fill-driver/70 text-xs">Voice Input, Route Matching, Capacity Signals</text>
        
        <text x="430" y="235" className="fill-city text-sm font-semibold">City Systems (Future)</text>
        <text x="430" y="255" className="fill-city/70 text-xs">Traffic Signals, Parking, Congestion Data</text>
        
        {/* Connection arrows */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground" />
          </marker>
        </defs>
        
        {/* Bidirectional arrows */}
        <line x1="400" y1="100" x2="400" y2="115" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-muted-foreground" />
        <line x1="400" y1="120" x2="400" y2="105" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-muted-foreground" />
        
        <line x1="220" y1="190" x2="220" y2="205" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-muted-foreground" />
        <line x1="220" y1="210" x2="220" y2="195" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-muted-foreground" />
        
        {/* Protocol boxes */}
        <rect x="280" y="310" width="100" height="50" rx="4" className="fill-background stroke-border" strokeWidth="1" />
        <text x="330" y="340" textAnchor="middle" className="fill-foreground text-xs font-medium">Open APIs</text>
        
        <rect x="400" y="310" width="100" height="50" rx="4" className="fill-background stroke-border" strokeWidth="1" />
        <text x="450" y="340" textAnchor="middle" className="fill-foreground text-xs font-medium">Data Standards</text>
        
        <rect x="520" y="310" width="100" height="50" rx="4" className="fill-background stroke-border" strokeWidth="1" />
        <text x="570" y="340" textAnchor="middle" className="fill-foreground text-xs font-medium">Governance</text>
        
        {/* Connecting lines to protocol boxes */}
        <path d="M400 100 L400 100 L330 310" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-border" fill="none" />
        <path d="M400 100 L400 100 L450 310" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-border" fill="none" />
        <path d="M400 100 L400 100 L570 310" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-border" fill="none" />
      </svg>
      <p className="text-center text-sm text-muted-foreground mt-4">
        High-level structure of the Delhi Logistics Public Protocol
      </p>
    </div>
  );
};

export default ArchitectureDiagram;
