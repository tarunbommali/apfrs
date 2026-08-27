import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { landingFor, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — e-Office Jntugv" },
      {
        name: "description",
        content: "Secure sign-in for e-Office Jntugv administrators and faculty to access attendance reports.",
      },
      { property: "og:title", content: "Sign in — e-Office Jntugv" },
      { property: "og:description", content: "Access the e-Office Jntugv attendance and faculty reporting console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <p className="font-mono text-lg font-semibold text-sidebar-accent-foreground">e-Office Jntugv</p>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Attendance, verified. Faculty reports, delivered.
          </h2>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/75">
            Upload monthly biometric sheets, sync academic calendars, review department summaries, and dispatch faculty statements seamlessly.
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
          <h1 className="mt-5 text-2xl font-semibold">Sign in to e-Office Jntugv</h1>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
