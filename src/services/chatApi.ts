import type { ConversationReply } from "../mock/conversation";

export type AiConnection = "checking" | "live" | "local" | "offline" | "error";

export type ApiChatMessage = { role: "user" | "assistant"; content: string };

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function getAiStatus(): Promise<AiConnection> {
  if (!navigator.onLine) return "offline";
  try {
    const response = await fetchWithTimeout("/api/kahy/status", { headers: { Accept: "application/json" } }, 3500);
    if (!response.ok) return "local";
    const data = await response.json() as { configured?: boolean };
    return data.configured ? "live" : "local";
  } catch {
    return "local";
  }
}

export async function requestAiReply(messages: ApiChatMessage[], context?: string): Promise<{ reply: ConversationReply; provider: string }> {
  if (!navigator.onLine) {
    const error = new Error("Sin conexión: se usará el motor local.") as Error & { code?: string };
    error.code = "OFFLINE";
    throw error;
  }
  let response: Response;
  try {
    response = await fetchWithTimeout("/api/kahy/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ messages, context }),
    });
  } catch {
    const error = new Error("La IA en línea tardó demasiado; se usará el motor local.") as Error & { code?: string };
    error.code = navigator.onLine ? "AI_TIMEOUT" : "OFFLINE";
    throw error;
  }
  const data = await response.json().catch(() => ({})) as { reply?: ConversationReply; provider?: string; code?: string; error?: string };
  if (!response.ok || !data.reply) {
    const error = new Error(data.error || "La IA no está disponible.") as Error & { code?: string };
    error.code = data.code;
    throw error;
  }
  return { reply: data.reply, provider: data.provider || "openai" };
}
