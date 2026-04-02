const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type GetTokenFn = () => string | null;
type RefreshFn = () => Promise<string | null>;

interface ApiClientOptions {
  getToken: GetTokenFn;
  onRefresh: RefreshFn;
  onUnauthorized: () => void;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit,
  getToken: GetTokenFn,
  onRefresh: RefreshFn,
  onUnauthorized: () => void,
  retried = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !retried) {
    const newToken = await onRefresh();
    if (newToken) {
      return request<T>(path, options, () => newToken, onRefresh, onUnauthorized, true);
    } else {
      onUnauthorized();
      throw new ApiError(401, "Unauthorized");
    }
  }

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const msg = (body && typeof body === "object" && "error" in body)
      ? String((body as Record<string, unknown>).error)
      : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export function createApiClient(opts: ApiClientOptions) {
  const { getToken, onRefresh, onUnauthorized } = opts;

  function req<T>(path: string, init: RequestInit): Promise<T> {
    return request<T>(path, init, getToken, onRefresh, onUnauthorized);
  }

  return {
    get<T>(path: string): Promise<T> {
      return req<T>(path, { method: "GET" });
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return req<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return req<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
    },
    delete<T>(path: string): Promise<T> {
      return req<T>(path, { method: "DELETE" });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export { ApiError };

// ── Unauthenticated requests (login / register / refresh) ─────
export async function authFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}
