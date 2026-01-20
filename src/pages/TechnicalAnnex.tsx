import { PageLayout } from "@/components/layout/PageLayout";
import { TechnicalArchitectureDiagram } from "@/components/diagrams/TechnicalArchitectureDiagram";

const TechnicalAnnex = () => {
  return (
    <PageLayout>
      <div className="container-narrow">
        {/* Header */}
        <section className="section-block border-b border-border">
          <h1 className="mb-4">Technical Annex</h1>
          <p className="section-description">
            Internal architecture and data flow of the Delhi Logistics Public Protocol.
          </p>
          
          {/* Disclaimer Banner */}
          <div className="disclaimer-box mt-6">
            <strong>Disclaimer:</strong> This annex describes Phase-0 and Phase-1 conceptual architecture. 
            It is illustrative and does not represent full production deployment.
          </div>
        </section>

        {/* Section 1: System Architecture */}
        <section className="section-block border-b border-border">
          <h2 className="section-title">System Architecture Overview</h2>
          <div className="max-w-3xl mb-8">
            <p className="text-foreground mb-6 leading-relaxed">
              DLPP consists of the following logical components:
            </p>
            <ul className="bullet-list">
              <li>Voice Intake Service</li>
              <li>Intent Parsing Module</li>
              <li>Coordination and Matching Engine</li>
              <li>Simulation Layer</li>
              <li>Visualization Interface</li>
            </ul>
            <p className="text-muted-foreground text-sm mt-4">
              Each component can be developed and tested independently.
            </p>
          </div>
          
          <TechnicalArchitectureDiagram />
        </section>

        {/* Section 2: AI Usage Boundaries */}
        <section className="section-block border-b border-border">
          <h2 className="section-title">AI Usage Boundaries</h2>
          <div className="max-w-3xl">
            <p className="text-foreground mb-6 leading-relaxed">
              Artificial intelligence is used selectively.
            </p>
            
            <h3 className="font-semibold mb-3 text-foreground">Usage Principles</h3>
            <ul className="bullet-list mb-6">
              <li>Generative AI is limited to language translation and speech interfaces</li>
              <li>Coordination and matching logic is deterministic in early phases</li>
              <li>Safety-critical decisions do not rely on generative models</li>
            </ul>
            
            <div className="policy-card">
              <p className="text-muted-foreground text-sm">
                This reduces risk and improves interpretability.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Data Flow */}
        <section className="section-block border-b border-border">
          <h2 className="section-title">Data Flow Description</h2>
          <div className="max-w-3xl">
            <ol className="space-y-4">
              {[
                "A driver provides a voice input describing movement intent.",
                "Speech is converted to text.",
                "Intent parsing extracts origin, destination, and capacity.",
                "A structured logistics node is created.",
                "The node is matched against pre-fed demand signals.",
                "Results are visualized on the shared grid."
              ].map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                    {index + 1}
                  </span>
                  <span className="text-foreground pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Section 4: Demonstration Constraints */}
        <section className="section-block">
          <h2 className="section-title">Demonstration Constraints</h2>
          <div className="max-w-3xl">
            <p className="text-foreground mb-6 leading-relaxed">
              The current demonstration:
            </p>
            <ul className="bullet-list mb-6">
              <li>Uses scripted data</li>
              <li>Uses rule-based matching</li>
              <li>Does not perform real-time optimization</li>
              <li>Does not control physical infrastructure</li>
            </ul>
            
            <div className="disclaimer-box">
              These constraints are intentional for clarity and safety.
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default TechnicalAnnex;
