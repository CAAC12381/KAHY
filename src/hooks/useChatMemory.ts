import { useEffect, useState } from "react";
import type { ChatTopic } from "../mock/conversation";
import { fetchRemoteChatMemory, saveRemoteChatMemory, clearRemoteChatMemory } from "../services/dataApi";

export type ChatMemoryEntry = { topic: ChatTopic; at: number };

const STORAGE_KEY = "kahy.chat-memory.v1";
const MAX_ENTRIES = 8;

function readMemory(): ChatMemoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((entry): entry is ChatMemoryEntry => Boolean(entry) && typeof (entry as ChatMemoryEntry).topic === "string" && typeof (entry as ChatMemoryEntry).at === "number");
  } catch {
    return [];
  }
}

function writeMemory(entries: ChatMemoryEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/**
 * Topic-only memory of recent conversations, opt-in via rememberConversations.
 * localStorage is read immediately so the UI never waits on a network round
 * trip; the database (keyed by deviceId, no account needed) is a durable
 * mirror consulted once on mount so memory survives a cleared cache or a
 * different browser on the same person's data.
 */
export function useChatMemory(enabled: boolean, deviceId: string) {
  const [entries, setEntries] = useState<ChatMemoryEntry[]>(() => (enabled ? readMemory() : []));

  useEffect(() => {
    if (!enabled) return;
    fetchRemoteChatMemory(deviceId).then((remote) => {
      if (!remote || !remote.length) return;
      const merged = remote as ChatMemoryEntry[];
      writeMemory(merged);
      setEntries(merged);
    });
    // Solo al activarse o cambiar de dispositivo — remember() ya mantiene el estado local al día después de esto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, deviceId]);

  function remember(topic: ChatTopic) {
    if (!enabled || topic === "inicio" || topic === "conversación") return;
    setEntries((current) => {
      if (current.length && current[current.length - 1].topic === topic) return current;
      const next = [...current, { topic, at: Date.now() }].slice(-MAX_ENTRIES);
      writeMemory(next);
      saveRemoteChatMemory(deviceId, topic);
      return next;
    });
  }

  function clear() {
    writeMemory([]);
    setEntries([]);
    clearRemoteChatMemory(deviceId);
  }

  return { entries, remember, clear };
}
