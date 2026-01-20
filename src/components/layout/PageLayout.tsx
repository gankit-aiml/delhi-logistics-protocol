import { Header } from "./Header";
import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 mt-16">
        <div className="container-narrow text-center text-sm text-muted-foreground">
          <p>Delhi Logistics Public Protocol — A Digital Public Infrastructure Proposal</p>
          <p className="mt-1">This is a demonstration website for policy evaluation purposes.</p>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
