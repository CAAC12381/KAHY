import type { ConversationReply } from "../mock/conversation";

/** "busy": la IA en línea está saturada unos segundos (límite del plan gratuito); responde el motor local mientras. */
export type AiConnection = "checking" | "live" | "local" | "offline" | "busy" | "error";

export type ApiChatMessage = { role: "user" | "assistant"; content: string };

export type AiRequestError = Error & { code?: string; retryAfter?: number };

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
    const error = new Error("Sin conexión: se usará el motor local.") as AiRequestError;
    error.code = "OFFLINE";
    throw error;
  }
  let response: Response;
  try {
    // 15 s: si el modelo principal está saturado, el servidor prueba el de respaldo y puede esperar unos segundos.
    response = await fetchWithTimeout("/api/kahy/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ messages, context }),
    }, 15000);
  } catch {
    const error = new Error("La IA en línea tardó demasiado; se usará el motor local.") as AiRequestError;
    error.code = navigator.onLine ? "AI_TIMEOUT" : "OFFLINE";
    throw error;
  }
  const data = await response.json().catch(() => ({})) as { reply?: ConversationReply; provider?: string; code?: string; error?: string; retryAfter?: number };
  if (!response.ok || !data.reply) {
    const error = new Error(data.error || "La IA no está disponible.") as AiRequestError;
    error.code = data.code;
    if (typeof data.retryAfter === "number") error.retryAfter = data.retryAfter;
    throw error;
  }
  return { reply: data.reply, provider: data.provider || "openai" };
}
