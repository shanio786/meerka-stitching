const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE}/api`;

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export function apiGet<T = unknown>(path: string) {
  return apiFetch<T>(path);
}

export function apiPost<T = unknown>(path: string, body: Record<string, unknown>) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T = unknown>(path: string, body: Record<string, unknown>) {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path: string) {
  return apiFetch(path, { method: "DELETE" });
}
