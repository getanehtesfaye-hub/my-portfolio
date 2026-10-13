const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error("Could not load content");
  return res.json() as Promise<T>;
}

export async function post(path: string, body: unknown) {
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] };
  if (!res.ok) throw new Error(json.issues?.[0]?.message ?? json.error ?? "Request failed");
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}
