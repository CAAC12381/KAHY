import type { ConversationReply } from "../mock/conversation";

export type AiConnection = "checking" | "live" | "local" | "error";

export type ApiChatMessage = { role: "user" | "assistant"; content: string };

export async function getAiStatus(): Promise<AiConnection> {
  try {
    const response = await fetch("/api/kahy/status", { headers: { Accept: "application/json" } });
    if (!response.ok) return "local";
    const data = await response.json() as { configured?: boolean };
    return data.configured ? "live" : "local";
  } catch {
    return "local";
  }
}

export async function requestAiReply(messages: ApiChatMessage[]): Promise<{ reply: ConversationReply; provider: string }> {
  const response = await fetch("/api/kahy/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await response.json().catch(() => ({})) as { reply?: ConversationReply; provider?: string; code?: string; error?: string };
  if (!response.ok || !data.reply) {
    const error = new Error(data.error || "La IA no está disponible.") as Error & { code?: string };
    error.code = data.code;
    throw error;
  }
  return { reply: data.reply, provider: data.provider || "openai" };
}
