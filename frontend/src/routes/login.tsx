import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { landingFor, useAuth } from "@/lib/auth";

import { LoginForm } from "./-login/LoginForm";
import { BrandingSidebar } from "./-login/BrandingSidebar";

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

function useLogin() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      void navigate({ to: landingFor(user.role), replace: true });
    }
  }, [ready, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok || !res.user) {
      setError(res.error ?? "Sign-in failed.");
      return;
    }
    void navigate({ to: landingFor(res.user.role), replace: true });
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    loading,
    handleSubmit,
  };
}

function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    loading,
    handleSubmit,
  } = useLogin();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* ── Branding Sidebar ── */}
      <BrandingSidebar />

      {/* ── Login Form ── */}
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="size-3.5 text-accent" /> Secure portal
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Sign in to e-Office Jntugv</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your institutional email address.
          </p>

          <LoginForm
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            error={error}
            isLoading={loading}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
