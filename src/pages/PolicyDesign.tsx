import { PageLayout } from "@/components/layout/PageLayout";

const PolicyDesign = () => {
  return (
    <PageLayout>
      <div className="container-narrow">
        {/* Header */}
        <section className="section-block border-b border-border">
          <h1 className="mb-4">Policy Design</h1>
          <p className="section-description">
            How the Delhi Logistics Public Protocol is structured to ensure institutional 
            feasibility, stakeholder trust, and sustainable adoption.
          </p>
        </section>

        {/* Section 1: Protocol vs Platform */}
        <section className="section-block border-b border-border">
          <h2 className="section-title">Protocol vs Platform</h2>
          <div className="max-w-3xl">
            <p className="text-foreground mb-6 leading-relaxed">
              DLPP is a protocol, not an application. It does not replace private logistics 
              platforms. It provides neutral coordination rails that multiple private 
              applications can use simultaneously.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="policy-card">
                <h3 className="font-semibold mb-3 text-foreground">Private Platforms Retain</h3>
                <ul className="bullet-list">
                  <li>Customer relationships</li>
                  <li>Pricing logic</li>
                  <li>Brand interfaces</li>
                </ul>
              </div>
              <div className="policy-card">
                <h3 className="font-semibold mb-3 text-foreground">DLPP Provides</h3>
                <ul className="bullet-list">
                  <li>Shared visibility</li>
                  <li>Coordination signals</li>
                  <li>Neutral optimization incentives</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Simple diagram */}
          <div className="mt-8 p-6 bg-muted rounded-md max-w-2xl">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="text-center flex-1">
                <div className="w-20 h-20 mx-auto rounded-md bg-private/20 border-2 border-private flex items-center justify-center mb-2">
                  <span className="text-private font-medium text-xs">App A</span>
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="w-20 h-20 mx-auto rounded-md bg-private/20 border-2 border-private flex items-center justify-center mb-2">
                  <span className="text-private font-medium text-xs">App B</span>
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="w-20 h-20 mx-auto rounded-md bg-private/20 border-2 border-private flex items-center justify-center mb-2">
                  <span className="text-private font-medium text-xs">App C</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center my-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div className="text-center">
              <div className="inline-block px-8 py-4 rounded-md bg-primary/10 border-2 border-primary">
                <span className="text-primary font-semibold">DLPP Protocol Layer</span>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Multiple private applications connect through a single neutral protocol
            </p>
          </div>
        </section>

        {/* Section 2: Governance Model */}
        <section className="section-block border-b border-border">
          <h2 className="section-title">Governance Model</h2>
          <div className="max-w-3xl">
            <p className="text-foreground mb-6 leading-relaxed">
              DLPP is envisioned as a government-led Digital Public Infrastructure.
            </p>
            
            <h3 className="font-semibold mb-3 text-foreground">Key Governance Principles</h3>
            <ul className="bullet-list mb-6">
              <li>Operated by a public authority or a Special Purpose Vehicle</li>
              <li>Open, documented APIs</li>
              <li>Voluntary integration by private platforms</li>
              <li>Opt-in participation for drivers</li>
            </ul>
            
            <div className="disclaimer-box">
              The protocol does not mandate behavioral compliance. 
              Adoption is driven by utility, not enforcement.
            </div>
          </div>
        </section>

        {/* Section 3: Data Safeguards */}
        <section className="section-block border-b border-border">
          <h2 className="section-title">Data Safeguards and Trust</h2>
          <div className="max-w-3xl">
            <p className="text-foreground mb-6 leading-relaxed">
              All data collected by DLPP is purpose-limited.
            </p>
            
            <h3 className="font-semibold mb-3 text-foreground">Safeguards Include</h3>
            <ul className="bullet-list mb-6">
              <li>No retrospective taxation or challans</li>
              <li>No use of data for unrelated enforcement</li>
              <li>Aggregation and anonymization by default</li>
            </ul>
            
            <div className="policy-card bg-accent/30">
              <p className="text-foreground text-sm">
                <strong>Driver Rights:</strong> Drivers retain the right to opt out at any time.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Incentive Alignment */}
        <section className="section-block">
          <h2 className="section-title">Institutional Incentive Alignment</h2>
          <div className="max-w-3xl">
            <p className="text-foreground mb-6 leading-relaxed">
              DLPP aligns institutional incentives to avoid resistance.
            </p>
            
            <h3 className="font-semibold mb-3 text-foreground">Key Mechanisms</h3>
            <ul className="bullet-list mb-6">
              <li>Micro-fees paid by large aggregators for optimization access</li>
              <li>Subsidized access for independent drivers</li>
              <li>A fixed share of protocol revenue allocated to traffic police road safety funds</li>
            </ul>
            
            <p className="text-muted-foreground text-sm mt-6">
              This ensures all stakeholders benefit from improved coordination.
            </p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default PolicyDesign;
