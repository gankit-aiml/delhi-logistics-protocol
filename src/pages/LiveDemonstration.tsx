import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { VoiceInputPanel, ParsedIntent } from "@/components/demo/VoiceInputPanel";
import { DelhiMap } from "@/components/demo/DelhiMap";

const LiveDemonstration = () => {
  const [currentIntent, setCurrentIntent] = useState<ParsedIntent | null>(null);

  const handleIntentParsed = (intent: ParsedIntent) => {
    setCurrentIntent(intent);
  };

  return (
    <PageLayout>
      <div className="container-narrow">
        {/* Header */}
        <section className="py-6 border-b border-border">
          <h1 className="mb-2">Live Demonstration</h1>
          <p className="section-description">
            Execution proof of DLPP's core coordination logic: voice input to route matching.
          </p>
          <div className="disclaimer-box mt-4">
            This demonstration uses scripted data and rule-based matching. 
            It does not connect to live systems or perform real-time optimization.
          </div>
        </section>

        {/* Split Screen Demo */}
        <section className="py-6">
          <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
            {/* Left Panel - Voice Input (35%) */}
            <div className="lg:w-[35%] p-6 bg-card border border-border rounded-md">
              <VoiceInputPanel onIntentParsed={handleIntentParsed} />
            </div>

            {/* Right Panel - Map (65%) */}
            <div className="lg:w-[65%] h-[500px] lg:h-auto">
              <DelhiMap intent={currentIntent} />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-8 border-t border-border">
          <h2 className="section-title mb-4">How This Demonstration Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="policy-card">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm mb-3">1</div>
              <h3 className="font-semibold text-foreground mb-2">Voice Input</h3>
              <p className="text-muted-foreground text-sm">
                Driver speaks origin, destination, and capacity. Browser's Web Speech API captures the input.
              </p>
            </div>
            <div className="policy-card">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm mb-3">2</div>
              <h3 className="font-semibold text-foreground mb-2">Intent Parsing</h3>
              <p className="text-muted-foreground text-sm">
                Rule-based parser extracts structured data: origin location, destination, and available capacity.
              </p>
            </div>
            <div className="policy-card">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm mb-3">3</div>
              <h3 className="font-semibold text-foreground mb-2">Route Matching</h3>
              <p className="text-muted-foreground text-sm">
                Pre-fed delivery orders are matched against the route. Orders that fit capacity are highlighted on the map.
              </p>
            </div>
          </div>
        </section>

        {/* Constraints */}
        <section className="py-6 border-t border-border">
          <h3 className="font-semibold text-foreground mb-3">Demonstration Constraints</h3>
          <ul className="bullet-list text-sm max-w-2xl">
            <li>Locations are limited to major Delhi areas</li>
            <li>Matching uses proximity-based rules, not route optimization</li>
            <li>Delivery orders are pre-defined, not fetched from external systems</li>
            <li>Speech recognition requires Chrome or Edge browser</li>
          </ul>
        </section>
      </div>
    </PageLayout>
  );
};

export default LiveDemonstration;
