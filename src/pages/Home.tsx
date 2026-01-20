import { PageLayout } from "@/components/layout/PageLayout";
import { ArchitectureDiagram } from "@/components/diagrams/ArchitectureDiagram";

const Home = () => {
  return (
    <PageLayout>
      <div className="container-narrow">
        {/* Hero Section */}
        <section className="section-block text-center border-b border-border">
          <h1 className="mb-4">Delhi Logistics Public Protocol (DLPP)</h1>
          <p className="text-xl text-muted-foreground mb-8">
            A Digital Public Infrastructure for Coordinating Urban Goods Movement
          </p>
          <div className="max-w-3xl mx-auto">
            <p className="text-foreground leading-relaxed">
              DLPP is a proposed government-led coordination protocol—not an application—designed 
              to enable efficient movement of goods across Delhi. It provides neutral infrastructure 
              that private logistics platforms can use to share visibility and optimize routes, 
              while maintaining their independence and competitive positioning.
            </p>
          </div>
        </section>

        {/* Architecture Diagram Section */}
        <section className="section-block">
          <h2 className="section-title text-center mb-8">System Structure</h2>
          <ArchitectureDiagram />
        </section>

        {/* Key Principles */}
        <section className="section-block border-t border-border">
          <h2 className="section-title mb-6">Core Principles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="policy-card">
              <h3 className="text-lg font-semibold mb-3 text-primary">Protocol, Not Platform</h3>
              <p className="text-muted-foreground text-sm">
                DLPP provides coordination rails, not a competing application. 
                Private platforms retain customer relationships and business logic.
              </p>
            </div>
            <div className="policy-card">
              <h3 className="text-lg font-semibold mb-3 text-primary">Voluntary Adoption</h3>
              <p className="text-muted-foreground text-sm">
                Integration is opt-in for all participants. Adoption is driven by 
                utility, not enforcement or mandates.
              </p>
            </div>
            <div className="policy-card">
              <h3 className="text-lg font-semibold mb-3 text-primary">Purpose-Limited Data</h3>
              <p className="text-muted-foreground text-sm">
                All data collected is strictly limited to coordination purposes. 
                No retrospective enforcement or unrelated use.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation prompt */}
        <section className="section-block border-t border-border">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Explore the detailed policy framework, technical architecture, and live demonstration.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <a href="/policy-design" className="text-primary hover:underline">Policy Design →</a>
              <a href="/technical-annex" className="text-primary hover:underline">Technical Annex →</a>
              <a href="/live-demonstration" className="text-primary hover:underline">Live Demonstration →</a>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Home;
