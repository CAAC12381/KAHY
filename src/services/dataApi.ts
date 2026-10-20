/**
 * Best-effort sync with the Postgres-backed /api/data/* endpoints.
 * Every function swallows its own errors and resolves to null/false instead
 * of throwing: localStorage stays the source of truth the UI reads
 * immediately, this is a background mirror so the same data survives a
 * cleared cache or a different browser. If the database isn't configured
 * yet, the app should keep working exactly as it did before this existed.
 *
 * Writes go through the sync outbox (syncOutbox.ts): if they can't be sent
 * now (offline, server error), they wait there and are retried in order.
 */

import type { TaskPlan } from "../types";
import type { HabitDay } from "../hooks/useDailyHabits";
import { authHeaders, clearSession, SESSION_EXPIRED_EVENT } from "./authApi";
import { enqueueSync } from "./syncOutbox";

async function safeFetch<T>(input: string, init?: RequestInit): Promise<T | null> {
  try {
    // Con cuenta, el servidor identifica los datos por la sesión y no por el deviceId que viaja en la petición.
    const session = authHeaders();
    const response = await fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string> | undefined), ...session } });
    if (response.status === 401 && session.Authorization) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
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
  enqueueSync("profile", deviceId, "/api/data/profile", { method: "PUT", body: { deviceId, profile } });
}

/** Deletes every table's rows for this deviceId — used by "borrar perfil guardado en este dispositivo". */
export function deleteRemoteData(deviceId: string): void {
  enqueueSync("all", deviceId, `/api/data/profile?deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
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
  enqueueSync(`screening:${result.id}`, deviceId, "/api/data/screenings", { method: "POST", body: { deviceId, result } });
}

export type RemoteMemoryEntry = { topic: string; at: number };

export async function fetchRemoteChatMemory(deviceId: string): Promise<RemoteMemoryEntry[] | null> {
  const data = await safeFetch<{ entries: RemoteMemoryEntry[] }>(`/api/data/chat-memory?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.entries ?? null;
}

export function saveRemoteChatMemory(deviceId: string, topic: string): void {
  enqueueSync(`chat-memory:${Date.now()}`, deviceId, "/api/data/chat-memory", { method: "POST", body: { deviceId, topic } });
}

export function clearRemoteChatMemory(deviceId: string): void {
  enqueueSync("chat-memory:clear", deviceId, `/api/data/chat-memory?deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
}

export type RemotePetGarden = {
  happiness: number;
  bond: number;
  progress: number;
  careCounts: Record<string, number>;
  lastCare: number;
  rewardedMilestones: string[];
};

export async function fetchRemotePetGarden(deviceId: string): Promise<RemotePetGarden | null> {
  const data = await safeFetch<{ state: RemotePetGarden | null }>(`/api/data/pet-garden?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.state ?? null;
}

export function saveRemotePetGarden(deviceId: string, state: RemotePetGarden): void {
  enqueueSync("pet-garden", deviceId, "/api/data/pet-garden", { method: "PUT", body: { deviceId, state } });
}

export type RemoteEmotionEntry = {
  id: string;
  at: number;
  primary: string;
  detail: string;
  intensity: string;
  progress: string;
  confidence: string;
};

export async function fetchRemoteEmotions(deviceId: string): Promise<RemoteEmotionEntry[] | null> {
  const data = await safeFetch<{ entries: RemoteEmotionEntry[] }>(`/api/data/emotions?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.entries ?? null;
}

export function saveRemoteEmotion(deviceId: string, entry: RemoteEmotionEntry): void {
  enqueueSync(`emotion:${entry.id}`, deviceId, "/api/data/emotions", { method: "POST", body: { deviceId, entry } });
}

export function clearRemoteEmotions(deviceId: string): void {
  enqueueSync("emotion:clear", deviceId, `/api/data/emotions?deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
}

export async function fetchRemoteTaskPlans(deviceId: string): Promise<TaskPlan[] | null> {
  const data = await safeFetch<{ plans: TaskPlan[] }>(`/api/data/task-plans?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.plans ?? null;
}

export function saveRemoteTaskPlan(deviceId: string, plan: TaskPlan): void {
  enqueueSync(`task-plan:${plan.id}`, deviceId, "/api/data/task-plans", { method: "PUT", body: { deviceId, plan } });
}

/** Sin planId borra todos los planes de este dispositivo. */
export function deleteRemoteTaskPlan(deviceId: string, planId?: string): void {
  const plan = planId ? `&planId=${encodeURIComponent(planId)}` : "";
  enqueueSync(planId ? `task-plan:${planId}` : "task-plan:clear", deviceId, `/api/data/task-plans?deviceId=${encodeURIComponent(deviceId)}${plan}`, { method: "DELETE" });
}

export async function fetchRemoteHabitDays(deviceId: string): Promise<HabitDay[] | null> {
  const data = await safeFetch<{ days: HabitDay[] }>(`/api/data/habits?deviceId=${encodeURIComponent(deviceId)}`);
  return data?.days ?? null;
}

export function saveRemoteHabitDay(deviceId: string, day: HabitDay): void {
  enqueueSync(`habit:${day.date}`, deviceId, "/api/data/habits", { method: "PUT", body: { deviceId, day } });
}
