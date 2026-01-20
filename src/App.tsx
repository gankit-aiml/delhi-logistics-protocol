import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PolicyDesign from "./pages/PolicyDesign";
import TechnicalAnnex from "./pages/TechnicalAnnex";
import LiveDemonstration from "./pages/LiveDemonstration";
import ScopeLimitations from "./pages/ScopeLimitations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/policy-design" element={<PolicyDesign />} />
          <Route path="/technical-annex" element={<TechnicalAnnex />} />
          <Route path="/live-demonstration" element={<LiveDemonstration />} />
          <Route path="/scope-limitations" element={<ScopeLimitations />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
