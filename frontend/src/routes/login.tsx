import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { landingFor, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — APFRS Faculty Reporting" },
      {
        name: "description",
        content: "Secure sign-in for APFRS administrators and faculty to access attendance reports.",
      },
      { property: "og:title", content: "Sign in — APFRS" },
      { property: "og:description", content: "Access the APFRS attendance and payroll reporting console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: landingFor(user.role), replace: true });
  }, [ready, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok || !res.user) {
      setError(res.error ?? "Sign-in failed.");
      return;
    }
    navigate({ to: landingFor(res.user.role), replace: true });
  };

  return (

    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="ink-gradient relative hidden flex-col justify-between p-12 lg:flex">
        <p className="font-mono text-lg font-semibold text-sidebar-accent-foreground">APFRS</p>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Attendance, verified. Payroll reports, delivered.
          </h2>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/75">
            Upload the monthly biometric sheet, review department-wise summaries, and dispatch each
            faculty member their individual statement in one pass.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">
          JNTU-GV College of Engineering · Vizianagaram
        </p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="size-3.5 text-accent" /> Secure portal
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Sign in to APFRS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your institutional email address.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apfrs.in"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-md border border-border bg-muted/60 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Default admin credentials</p>
            <p className="mt-1 font-mono">admin@apfrs.in · admin@123</p>
            <p className="mt-1 text-muted-foreground/70">Faculty login uses their institutional email + password set in the DB.</p>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Faculty members land on their own profile; admin pages stay restricted.
          </p>
        </div>
      </div>
    </div>
  );
}

