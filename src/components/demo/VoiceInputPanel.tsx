import { useState, useCallback } from "react";
import { Mic, MicOff, Loader2, ServerCrash, CheckCircle2 } from "lucide-react";
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

export const VoiceInputPanel = ({ onIntentParsed }: VoiceInputPanelProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("Ready via Vaani Backend");
  const [parsedResult, setParsedResult] = useState<ParsedIntent | null>(null);

  // The function that calls your Python Backend
  const parseWithBackend = async (text: string) => {
    setIsProcessing(true);
    setStatus("Sending to Vaani Engine (Llama-3)...");

    try {
      const response = await fetch("https://delhi-logistics-protocol.onrender.com/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Backend Error");

      const data = await response.json();
      
      const result: ParsedIntent = {
        origin: data.origin,
        destination: data.destination,
        capacity: data.capacity,
        confidence: data.confidence,
        rawText: text
      };

      setParsedResult(result);
      onIntentParsed(result);
      setStatus(" AI Processed Successfully");

    } catch (error) {
      console.error(error);
      setStatus(" Backend Connection Failed. Is main.py running?");
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = useCallback(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN"; // Use Hindi input for better Hinglish recognition
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening... (Speak naturally)");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      // Send transcript to Backend
      parseWithBackend(transcript);
    };

    recognition.start();
  }, []);

  // Demo Simulation for when you don't want to speak
  const simulateBackend = () => {
    const demos = [
      "Main Azadpur Mandi se Okhla Phase 3 ja raha hun, gaadi poori khali hai",
      "Gurgaon se Connaught Place jana hai, 50% capacity",
    ];
    const text = demos[Math.floor(Math.random() * demos.length)];
    parseWithBackend(text);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-slate-50/50">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Vaani AI Input</h2>
        <p className="text-sm text-slate-500">
          Powered by <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">Llama-3-8b</span> via Python Backend.
        </p>
      </div>

      <div className="flex gap-4">
        <Button 
          onClick={startListening} 
          disabled={isListening || isProcessing}
          className={`w-full h-16 text-lg ${isListening ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
        >
          {isListening ? "Listening..." : isProcessing ? "AI Processing..." : " Speak "}
        </Button>
        <Button onClick={simulateBackend} variant="outline" className="h-16 px-6">
          Simulate
        </Button>
      </div>

      {/* Terminal / Log Output - FIXED SECTION BELOW */}
      <div className="flex-1 bg-black rounded-lg p-4 font-mono text-sm border border-slate-800 shadow-inner overflow-hidden">
        <div className="text-gray-500 border-b border-gray-800 pb-2 mb-2 text-xs">
          &gt; VAANI_GATEWAY_V1.5 [ONLINE]
        </div>
        
        <div className="text-green-400">
          &gt; Status: {status}
        </div>

        {parsedResult && (
          <div className="mt-4 animate-in slide-in-from-left-2 fade-in">
            <div className="text-blue-400">&gt; Input Received:</div>
            <div className="text-white ml-2 mb-2">"{parsedResult.rawText}"</div>
            
            <div className="text-purple-400">&gt; Entity Extraction:</div>
            <div className="ml-2 text-yellow-300">
               Origin: "{parsedResult.origin}" <br/>
               Dest: "{parsedResult.destination}" <br/>
               Load: {parsedResult.capacity}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
