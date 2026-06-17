import { config } from "../config.js";

function baseUrl(): string {
  return `${config.INSFORGE_BASE_URL.replace(/\/$/, "")}/api/database/records`;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.INSFORGE_API_KEY}`,
    "X-Project-ID": config.INSFORGE_PROJECT_ID,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

export async function dbInsert<T>(
  table: string,
  data: T,
): Promise<T> {
  const res = await fetch(`${baseUrl()}/${table}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify([data]),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`InsForge insert failed: ${res.status}`);
  const rows = (await res.json()) as T[];
  return (rows[0] ?? {}) as T;
}

export async function dbSelect<T>(
  table: string,
  filters: Record<string, unknown> = {},
): Promise<T[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    params.set(k, `eq.${v}`);
  }
  const res = await fetch(`${baseUrl()}/${table}?${params}`, {
    headers: headers(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`InsForge select failed: ${res.status}`);
  return res.json() as Promise<T[]>;
}

export async function dbUpdate<T>(
  table: string,
  id: string,
  data: Partial<T> | Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${baseUrl()}/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`InsForge update failed: ${res.status}`);
  const rows = (await res.json()) as T[];
  return (rows[0] ?? {}) as T;
}
