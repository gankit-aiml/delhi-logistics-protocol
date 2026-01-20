import { PageLayout } from "@/components/layout/PageLayout";

const ScopeLimitations = () => {
  return (
    <PageLayout>
      <div className="container-narrow">
        {/* Header */}
        <section className="section-block border-b border-border">
          <h1 className="mb-4">Scope & Limitations</h1>
          <p className="section-description">
            Explicit boundaries of what this demonstration proves and does not claim.
          </p>
        </section>

        {/* Two Column Layout */}
        <section className="section-block">
          <div className="grid md:grid-cols-2 gap-8">
            {/* What This Shows */}
            <div>
              <h2 className="section-title text-matched">What This Demonstration Shows</h2>
              <div className="space-y-4 mt-6">
                <div className="policy-card border-l-4 border-l-matched">
                  <h3 className="font-semibold text-foreground mb-2">Coordination Feasibility</h3>
                  <p className="text-muted-foreground text-sm">
                    A voice-to-match workflow can parse driver intent and visualize 
                    logistics coordination in real time.
                  </p>
                </div>
                <div className="policy-card border-l-4 border-l-matched">
                  <h3 className="font-semibold text-foreground mb-2">Protocol Architecture</h3>
                  <p className="text-muted-foreground text-sm">
                    The separation between protocol layer and private application layer 
                    is technically achievable.
                  </p>
                </div>
                <div className="policy-card border-l-4 border-l-matched">
                  <h3 className="font-semibold text-foreground mb-2">Interface Simplicity</h3>
                  <p className="text-muted-foreground text-sm">
                    Drivers can interact through natural language without 
                    requiring complex application training.
                  </p>
                </div>
                <div className="policy-card border-l-4 border-l-matched">
                  <h3 className="font-semibold text-foreground mb-2">Visual Matching</h3>
                  <p className="text-muted-foreground text-sm">
                    Route-order matching can be displayed on a shared grid 
                    for transparency and coordination.
                  </p>
                </div>
              </div>
            </div>

            {/* What This Does Not Claim */}
            <div>
              <h2 className="section-title text-destructive">What This Demonstration Does Not Claim</h2>
              <div className="space-y-4 mt-6">
                <div className="policy-card border-l-4 border-l-destructive">
                  <h3 className="font-semibold text-foreground mb-2">City-Wide Optimization</h3>
                  <p className="text-muted-foreground text-sm">
                    This demonstration does not claim to optimize logistics 
                    across all of Delhi. Scale requires further validation.
                  </p>
                </div>
                <div className="policy-card border-l-4 border-l-destructive">
                  <h3 className="font-semibold text-foreground mb-2">Enforcement Capability</h3>
                  <p className="text-muted-foreground text-sm">
                    DLPP does not enforce compliance. It provides coordination 
                    signals, not mandates.
                  </p>
                </div>
                <div className="policy-card border-l-4 border-l-destructive">
                  <h3 className="font-semibold text-foreground mb-2">Production Readiness</h3>
                  <p className="text-muted-foreground text-sm">
                    This is a Phase-0 demonstration using scripted data. 
                    Production deployment requires extensive testing.
                  </p>
                </div>
                <div className="policy-card border-l-4 border-l-destructive">
                  <h3 className="font-semibold text-foreground mb-2">Real-Time Traffic Control</h3>
                  <p className="text-muted-foreground text-sm">
                    The demonstration does not interface with traffic signals, 
                    parking systems, or physical infrastructure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Note */}
        <section className="section-block border-t border-border">
          <div className="disclaimer-box max-w-3xl mx-auto text-center">
            <p className="text-foreground">
              <strong>Evaluation Criterion:</strong> This demonstration is designed for 
              execution readiness assessment, not feature completeness. The goal is to 
              prove that the core coordination idea is technically feasible and institutionally coherent.
            </p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default ScopeLimitations;
