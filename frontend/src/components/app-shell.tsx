import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { GlobalSearch } from "@/components/global-search";
import { RequireRole } from "@/components/require-role";
import { Sidebar } from "@/components/sidebar";
import { useAuth, type Role } from "@/lib/auth";

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
  const { user } = useAuth();
  const role = user?.role ?? "admin";

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── App Sidebar ── */}
      <Sidebar />

      {/* ── Main Workspace ── */}
      <div className="min-w-0 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {subtitle ? (
                <p className="mt-0.5 max-w-2xl text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {role === "admin" ? <GlobalSearch /> : null}
              {actions}
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
