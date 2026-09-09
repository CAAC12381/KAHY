/**
 * Best-effort sync with the Postgres-backed /api/data/* endpoints.
 * Every function swallows its own errors and resolves to null/false instead
 * of throwing: localStorage stays the source of truth the UI reads
 * immediately, this is a background mirror so the same data survives a
 * cleared cache or a different browser. If the database isn't configured
 * yet, the app should keep working exactly as it did before this existed.
 */

async function safeFetch<T>(input: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type RemoteProfile = {
  name: string;
  companionType: string;
  mascot: string;
  flower: string;
  city: string;
  goals: string[];
  preferences: Record<string, unknown>;
};

export async function fetchRemoteProfile(deviceId: string): Promise<RemoteProfile | null> {
  const data = await safeFetch<{ profile: RemoteProfile | null }>(`/api/data/profile?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.profile ?? null;
}

export function saveRemoteProfile(deviceId: string, profile: RemoteProfile): void {
  void safeFetch("/api/data/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, profile }),
  });
}

/** Deletes every table's rows for this deviceId — used by "borrar perfil guardado en este dispositivo". */
export function deleteRemoteData(deviceId: string): void {
  void safeFetch(`/api/data/profile?deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
}

export type RemoteScreeningResult = {
  id: string;
  completedAt: number;
  answers: number[];
  score: number;
  band: string;
  item9Positive?: boolean;
};

export async function fetchRemoteScreenings(deviceId: string): Promise<RemoteScreeningResult[] | null> {
  const data = await safeFetch<{ results: RemoteScreeningResult[] }>(`/api/data/screenings?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.results ?? null;
}

export function saveRemoteScreening(deviceId: string, result: RemoteScreeningResult): void {
  void safeFetch("/api/data/screenings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, result }),
  });
}

export type RemoteMemoryEntry = { topic: string; at: number };

export async function fetchRemoteChatMemory(deviceId: string): Promise<RemoteMemoryEntry[] | null> {
  const data = await safeFetch<{ entries: RemoteMemoryEntry[] }>(`/api/data/chat-memory?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.entries ?? null;
}

export function saveRemoteChatMemory(deviceId: string, topic: string): void {
  void safeFetch("/api/data/chat-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, topic }),
  });
}

export function clearRemoteChatMemory(deviceId: string): void {
  void safeFetch(`/api/data/chat-memory?deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
}

export type RemotePetGarden = {
  happiness: number;
  bond: number;
  progress: number;
  careCounts: Record<string, number>;
  lastCare: number;
};

export async function fetchRemotePetGarden(deviceId: string): Promise<RemotePetGarden | null> {
  const data = await safeFetch<{ state: RemotePetGarden | null }>(`/api/data/pet-garden?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.state ?? null;
}

export function saveRemotePetGarden(deviceId: string, state: RemotePetGarden): void {
  void safeFetch("/api/data/pet-garden", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, state }),
  });
}
