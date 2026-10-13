const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Requested-With": "portfolio-admin" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is `npm run dev` running in the server folder?");
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    const issues = (json as { issues?: { path: string; message: string }[] }).issues;
    throw new ApiError(res.status, issues?.length ? issues.map((i) => `${i.path}: ${i.message}`).join("; ") : json.error ?? "Request failed");
  }
  return json as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
