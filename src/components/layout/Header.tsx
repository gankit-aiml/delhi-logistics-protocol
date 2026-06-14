import { Link, useLocation } from "react-router-dom";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/policy-design", label: "Policy Design" },
  { href: "/technical-annex", label: "Technical Annex" },
  { href: "/live-demonstration", label: "Live Demonstration" },
  { href: "/scope-limitations", label: "Scope & Limitations" },
  { href: "/researcher-dashboard", label: "Researcher Dashboard" },
];

export const Header = () => {
  const location = useLocation();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-[9999]">
      <div className="container-narrow">
        <nav className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <img
              src="/image-removebg-preview.png"
              alt="DLPP Logo"
              className="h-7 w-auto"
            />
            <span className="font-semibold text-lg tracking-tight">
              DLPP
            </span>
          </Link>
          <ul className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    location.pathname === item.href
                      ? "text-primary bg-accent font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* Mobile menu - simplified for policy document */}
          <div className="md:hidden">
            <MobileMenu items={navItems} currentPath={location.pathname} />
          </div>
        </nav>
      </div>
    </header>
  );
};

const MobileMenu = ({ items, currentPath }: { items: typeof navItems; currentPath: string }) => {
  return (
    <div className="relative group">
      <button className="p-2 text-muted-foreground hover:text-foreground">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <ul className="py-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={`block px-4 py-2 text-sm ${
                  currentPath === item.href
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Header;
