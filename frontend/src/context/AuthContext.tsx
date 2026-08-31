import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Role = "admin" | "faculty";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
};

type StoredSession = {
  user: SessionUser;
  token: string;
};

const STORAGE_KEY = "apfrs.session";

export type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  ready: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; user?: SessionUser; error?: string }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw) as StoredSession;
        if (session.user && session.token) {
          setUser(session.user);
          setToken(session.token);
        }
      }
    } catch {
      /* ignore malformed session */
    }
    setReady(true);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = (await res.json()) as {
          success: boolean;
          data?: { user: SessionUser; token: string };
          user?: SessionUser;
          token?: string;
          error?: string;
          message?: string;
        };

        if (!res.ok || !data.success) {
          return { ok: false, error: data.error ?? data.message ?? "Login failed." };
        }

        const apiUser = data.data?.user ?? data.user;
        const apiToken = data.data?.token ?? data.token;

        if (!apiUser || !apiToken) {
          return { ok: false, error: "Invalid response received from authentication server." };
        }

        const next: SessionUser = {
          id: apiUser.id,
          name: apiUser.name,
          email: apiUser.email,
          role: apiUser.role,
          department: apiUser.department,
        };

        const session: StoredSession = { user: next, token: apiToken };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setUser(next);
        setToken(apiToken);
        return { ok: true, user: next };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Network error — check your connection.",
        };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      /* best-effort logout */
    } finally {
      setUser(null);
      setToken(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [token]);

  const value = useMemo(
    () => ({ user, token, ready, signIn, signOut }),
    [user, token, ready, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const landingFor = (role: Role) =>
  role === "admin" ? "/" : "/faculty-profile";

/** Returns the stored JWT token (for use outside of React, e.g. emailService) */
export function getAuthToken(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    return session.token ?? null;
  } catch {
    return null;
  }
}
