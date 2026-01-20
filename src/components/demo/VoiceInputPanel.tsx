import { useState, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ParsedIntent {
  origin: string;
  destination: string;
  capacity: number;
  confidence: number;
  rawText: string;
}

interface VoiceInputPanelProps {
  onIntentParsed: (intent: ParsedIntent) => void;
}

// Delhi locations for parsing
const DELHI_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  "connaught place": { lat: 28.6315, lng: 77.2167, name: "Connaught Place" },
  "cp": { lat: 28.6315, lng: 77.2167, name: "Connaught Place" },
  "karol bagh": { lat: 28.6514, lng: 77.1907, name: "Karol Bagh" },
  "saket": { lat: 28.5245, lng: 77.2066, name: "Saket" },
  "dwarka": { lat: 28.5921, lng: 77.0460, name: "Dwarka" },
  "rohini": { lat: 28.7495, lng: 77.0565, name: "Rohini" },
  "lajpat nagar": { lat: 28.5677, lng: 77.2433, name: "Lajpat Nagar" },
  "nehru place": { lat: 28.5491, lng: 77.2533, name: "Nehru Place" },
  "okhla": { lat: 28.5306, lng: 77.2711, name: "Okhla" },
  "noida": { lat: 28.5355, lng: 77.3910, name: "Noida" },
  "gurgaon": { lat: 28.4595, lng: 77.0266, name: "Gurgaon" },
  "gurugram": { lat: 28.4595, lng: 77.0266, name: "Gurugram" },
  "janakpuri": { lat: 28.6219, lng: 77.0878, name: "Janakpuri" },
  "pitampura": { lat: 28.7041, lng: 77.1310, name: "Pitampura" },
  "vasant kunj": { lat: 28.5195, lng: 77.1569, name: "Vasant Kunj" },
  "mayur vihar": { lat: 28.6089, lng: 77.2969, name: "Mayur Vihar" },
  "chandni chowk": { lat: 28.6506, lng: 77.2303, name: "Chandni Chowk" },
  "old delhi": { lat: 28.6562, lng: 77.2410, name: "Old Delhi" },
  "new delhi": { lat: 28.6139, lng: 77.2090, name: "New Delhi" },
  "india gate": { lat: 28.6129, lng: 77.2295, name: "India Gate" },
};

// Parse capacity from text
const parseCapacity = (text: string): number => {
  const capacityPatterns = [
    /(\d+)\s*(?:ton|tons|tonne|tonnes)/i,
    /(\d+)\s*(?:kg|kgs|kilogram|kilograms)/i,
    /capacity\s*(?:of|is|:)?\s*(\d+)/i,
    /(\d+)\s*(?:boxes|crates|packages|items)/i,
  ];

  for (const pattern of capacityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (pattern.source.includes("kg")) return Math.round(value / 100); // Normalize to percentage
      if (pattern.source.includes("boxes")) return Math.min(value * 10, 100);
      return Math.min(value * 10, 100); // Tons to percentage
    }
  }
  return 70; // Default capacity
};

// Parse location from text
const parseLocation = (text: string, exclude?: string): string | null => {
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(DELHI_LOCATIONS)) {
    if (lowerText.includes(key) && key !== exclude?.toLowerCase()) {
      return value.name;
    }
  }
  return null;
};

// Main parsing function
const parseIntent = (text: string): ParsedIntent | null => {
  const lowerText = text.toLowerCase();
  
  // Find origin (look for "from" keyword first)
  let origin: string | null = null;
  let destination: string | null = null;
  
  const fromMatch = lowerText.match(/from\s+([a-z\s]+?)(?:\s+to|\s+going|\s+heading|$)/i);
  const toMatch = lowerText.match(/to\s+([a-z\s]+?)(?:\s+with|\s+carrying|\s+capacity|$)/i);
  
  if (fromMatch) {
    origin = parseLocation(fromMatch[1]);
  }
  if (toMatch) {
    destination = parseLocation(toMatch[1]);
  }
  
  // Fallback: find any two locations
  if (!origin || !destination) {
    const locations: string[] = [];
    for (const [key, value] of Object.entries(DELHI_LOCATIONS)) {
      if (lowerText.includes(key)) {
        locations.push(value.name);
      }
    }
    if (locations.length >= 2) {
      origin = origin || locations[0];
      destination = destination || locations[1];
    } else if (locations.length === 1) {
      origin = origin || locations[0];
      destination = destination || "Connaught Place"; // Default destination
    }
  }
  
  if (!origin) return null;
  
  const capacity = parseCapacity(text);
  const confidence = origin && destination ? 0.85 : 0.65;
  
  return {
    origin: origin || "Unknown",
    destination: destination || "Connaught Place",
    capacity,
    confidence,
    rawText: text,
  };
};

export const VoiceInputPanel = ({ onIntentParsed }: VoiceInputPanelProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const [parsedResult, setParsedResult] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    setError(null);
    setParsedResult(null);
    
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Try Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    
    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening...");
    };
    
    recognition.onresult = (event) => {
      setIsListening(false);
      setIsProcessing(true);
      setStatus("Processing...");
      
      const transcript = event.results[0][0].transcript;
      
      // Simulate processing delay
      setTimeout(() => {
        const parsed = parseIntent(transcript);
        setIsProcessing(false);
        
        if (parsed) {
          setParsedResult(parsed);
          setStatus("Intent parsed successfully");
          onIntentParsed(parsed);
        } else {
          setError("Could not parse location intent. Please mention Delhi locations like 'Karol Bagh', 'Saket', etc.");
          setStatus("Parsing failed");
        }
      }, 800);
    };
    
    recognition.onerror = (event) => {
      setIsListening(false);
      setIsProcessing(false);
      setError(`Speech recognition error: ${event.error}`);
      setStatus("Error occurred");
    };
    
    recognition.onend = () => {
      if (isListening) {
        setIsListening(false);
        setStatus("Stopped listening");
      }
    };
    
    recognition.start();
  }, [onIntentParsed, isListening]);

  const simulateVoice = () => {
    setError(null);
    setParsedResult(null);
    setIsProcessing(true);
    setStatus("Simulating voice input...");
    
    // Simulate different voice inputs
    const sampleInputs = [
      "Going from Karol Bagh to Saket with 3 tons capacity",
      "Truck from Rohini to Nehru Place carrying 5 tons",
      "Heading from Dwarka to Connaught Place with 2 tons",
      "From Okhla to Lajpat Nagar capacity 4 tons",
    ];
    
    const randomInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)];
    
    setTimeout(() => {
      const parsed = parseIntent(randomInput);
      setIsProcessing(false);
      
      if (parsed) {
        setParsedResult(parsed);
        setStatus("Intent parsed successfully");
        onIntentParsed(parsed);
      }
    }, 1200);
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Driver Input Simulation</h2>
      
      {/* Voice Button */}
      <div className="space-y-3 mb-6">
        <Button
          onClick={startListening}
          disabled={isListening || isProcessing}
          className="w-full h-12"
          variant={isListening ? "destructive" : "default"}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5 mr-2" />
              Listening...
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Activate Voice Input
            </>
          )}
        </Button>
        
        <Button
          onClick={simulateVoice}
          disabled={isListening || isProcessing}
          variant="secondary"
          className="w-full"
        >
          Simulate Voice (Demo)
        </Button>
      </div>
      
      {/* Status */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Status: <span className={isListening ? "text-matched animate-pulse-soft" : ""}>{status}</span>
        </p>
      </div>
      
      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      {/* Parsed Output */}
      {parsedResult && (
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Parsed Output</h3>
          
          <div className="policy-card space-y-3">
            {parsedResult.rawText && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Raw Input</label>
                <p className="text-sm text-foreground italic">"{parsedResult.rawText}"</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Origin</label>
                <p className="text-sm font-medium text-foreground">{parsedResult.origin}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Destination</label>
                <p className="text-sm font-medium text-foreground">{parsedResult.destination}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Capacity</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${parsedResult.capacity}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{parsedResult.capacity}%</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Confidence</label>
                <p className="text-sm font-medium text-foreground">{(parsedResult.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {!parsedResult && !error && (
        <div className="flex-1 flex items-end">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Example inputs:</strong></p>
            <p>"Going from Karol Bagh to Saket with 3 tons"</p>
            <p>"Truck from Rohini to Nehru Place"</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Add types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export default VoiceInputPanel;
