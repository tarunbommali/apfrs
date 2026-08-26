import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Mails,
  Radio,
  Table2,
  Upload,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { GlobalSearch } from "@/components/global-search";
import { RequireRole } from "@/components/require-role";
import { useAuth, type Role } from "@/lib/auth";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/import", label: "Import Data", icon: Upload, roles: ["admin"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  { to: "/detailed", label: "Detailed View", icon: Table2, roles: ["admin"] },
  { to: "/consolidated", label: "Bulk Dispatch", icon: Mails, roles: ["admin"] },
  { to: "/status-dashboard", label: "Delivery Status", icon: Radio, roles: ["admin"] },
  { to: "/calendar", label: "Academic Calendar", icon: CalendarDays, roles: ["admin", "faculty"] },
  { to: "/admin-dashboard", label: "Faculty Registry", icon: UserRound, roles: ["admin"] },
  { to: "/faculty-profile", label: "My Profile", icon: UserRound, roles: ["faculty"] },
] as const;


export function AppShell({
  title,
  subtitle,
  actions,
  roles = ["admin"],
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  roles?: Role[];
  children: ReactNode;
}) {
  return (
    <RequireRole roles={roles}>
      <AppShellInner title={title} subtitle={subtitle} actions={actions}>
        {children}
      </AppShellInner>
    </RequireRole>
  );
}

function AppShellInner({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "admin";
  const items = nav.filter((n) => (n.roles as readonly string[]).includes(role));

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="ink-gradient sticky top-0 z-20 hidden w-64 shrink-0 flex-col self-start lg:flex lg:h-screen">
        <div className="border-b border-sidebar-border px-6 py-6">
          <p className="font-mono text-lg font-semibold tracking-tight text-sidebar-accent-foreground">
            APFRS
          </p>
          <p className="mt-1 text-[11px] leading-tight text-sidebar-foreground/70">
            Attendance &amp; Payroll Faculty Reporting
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-xs font-medium text-sidebar-accent-foreground">
            {user?.name ?? "Guest"}
          </p>
          <p className="text-[11px] text-sidebar-foreground/60">{user?.email ?? "Not signed in"}</p>
          <p className="mt-1 inline-block rounded-full border border-sidebar-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/70">
            {role}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-sidebar-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              {subtitle ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <GlobalSearch />
              {actions}
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
            {items.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="shrink-0 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground font-medium" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </header>

        <main className="px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
