import { useState } from "react";
import type { ChatTopic, ConversationReply } from "../mock/conversation";

export type ChatHistoryMessage =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; reply: ConversationReply };

export type ChatHistorySession = {
  id: number;
  startedAt: number;
  topic: ChatTopic;
  preview: string;
  messages: ChatHistoryMessage[];
};

const STORAGE_KEY = "kahy.chat-history.v1";
const MAX_SESSIONS = 25;

function readSessions(): ChatHistorySession[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((entry): entry is ChatHistorySession => Boolean(entry) && typeof (entry as ChatHistorySession).id === "number" && Array.isArray((entry as ChatHistorySession).messages));
  } catch {
    return [];
  }
}

function writeSessions(sessions: ChatHistorySession[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/**
 * Full conversation transcripts, kept strictly on this device — this is
 * deliberately separate from useChatMemory (topic-only, optionally mirrored
 * to the database): the registration screen promises "nunca el texto que
 * escribes" for that feature specifically, so this one is its own toggle
 * (Preferences.saveChatHistory), its own storage key, and never touches
 * src/services/dataApi.ts or the server.
 */
export function useChatHistory(enabled: boolean) {
  const [sessions, setSessions] = useState<ChatHistorySession[]>(() => (enabled ? readSessions() : []));

  function archive(messages: ChatHistoryMessage[], topic: ChatTopic) {
    if (!enabled || messages.length <= 1) return;
    const firstUser = messages.find((message): message is Extract<ChatHistoryMessage, { role: "user" }> => message.role === "user");
    // El primer mensaje siempre es el saludo inicial con id fijo (1), no una marca de tiempo real,
    // así que el inicio real de la conversación es el primer mensaje que sí escribió la persona.
    const session: ChatHistorySession = {
      id: Date.now(),
      startedAt: firstUser?.id ?? Date.now(),
      topic,
      preview: firstUser ? firstUser.text.slice(0, 120) : "Conversación",
      messages,
    };
    setSessions((current) => {
      const next = [...current, session].slice(-MAX_SESSIONS);
      writeSessions(next);
      return next;
    });
  }

  function remove(id: number) {
    setSessions((current) => {
      const next = current.filter((session) => session.id !== id);
      writeSessions(next);
      return next;
    });
  }

  function clear() {
    writeSessions([]);
    setSessions([]);
  }

  return { sessions, archive, remove, clear };
}

export type ChatHistoryApi = ReturnType<typeof useChatHistory>;
