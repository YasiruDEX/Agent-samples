import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { MessageSquare, Settings as SettingsIcon, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  to: "/" | "/settings";
  label: string;
  icon: ReactNode;
};

const NAV: NavItem[] = [
  { to: "/", label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-[0_0_32px_-18px_rgba(255,255,255,0.85)] backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Agent Testing Workspace
            </div>
            <div className="text-xs text-muted-foreground">Agent validation dashboard</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner ring-1 ring-primary/40"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")
                }
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-white">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
          © 2026 WSO2
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/60 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 shadow-[0_0_28px_-16px_rgba(255,255,255,0.85)] backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm font-semibold">Agent Testing Workspace</div>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {location.pathname === "/settings" ? "Settings" : "Chat"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold">
              A
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <nav className="flex shrink-0 border-t border-border bg-sidebar md:hidden">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs " +
                  (active ? "text-white" : "text-muted-foreground")
                }
              >
                <span className="text-white">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
