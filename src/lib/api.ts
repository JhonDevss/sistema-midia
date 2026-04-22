const AUTH_USER_ID_KEY = "auth_user_id";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";

type ApiOptions = RequestInit & {
  includeAuthUser?: boolean;
};

export function getAuthUserId() {
  return localStorage.getItem(AUTH_USER_ID_KEY);
}

export function setAuthUserId(userId: string | null) {
  if (userId) {
    localStorage.setItem(AUTH_USER_ID_KEY, userId);
    return;
  }
  localStorage.removeItem(AUTH_USER_ID_KEY);
}

export function buildApiUrl(path: string) {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = buildApiUrl(path);
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const shouldIncludeAuthUser = options.includeAuthUser ?? true;
  if (shouldIncludeAuthUser) {
    const userId = getAuthUserId();
    if (userId) {
      headers.set("x-user-id", userId);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
      if (Array.isArray(payload?.issues) && payload.issues.length > 0 && payload.issues[0]?.message) {
        message = `${message} (${payload.issues[0].message})`;
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
