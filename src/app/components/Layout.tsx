import { Outlet, NavLink } from "react-router";
import { Home, Clock, Settings, Sparkles } from "lucide-react";

export default function Layout() {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/history", icon: Clock, label: "History" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Friday
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`
                }
                style={{ fontSize: "0.875rem" }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden shrink-0 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span style={{ fontSize: "0.625rem" }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}