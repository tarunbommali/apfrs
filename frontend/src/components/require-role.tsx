import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { landingFor, useAuth, type Role } from "@/lib/auth";

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/login", { replace: true });
    } else if (!roles.includes(user.role)) {
      navigate(landingFor(user.role), { replace: true });
    }
  }, [ready, user, roles, navigate]);

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking access…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
