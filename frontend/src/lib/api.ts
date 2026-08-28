import { getAuthToken } from "./auth";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  signal?: AbortSignal;
};

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Typed fetch helper that automatically attaches the JWT token and
 * handles common error shapes from the APFRS backend.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // Handle 401 — clear session and redirect to login
  if (res.status === 401) {
    window.localStorage.removeItem("apfrs.session");
    window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  let json: ApiResponse<T>;
  let isJson = true;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    isJson = false;
  }

  if (!res.ok || (isJson && !json.success)) {
    const errMsg = isJson ? (json.error ?? json.message) : `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errMsg ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    if (isJson) {
      (err as any).data = json.data;
    }
    throw err;
  }

  return json.data as T;
}
