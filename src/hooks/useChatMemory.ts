import { useState } from "react";
import type { ChatTopic } from "../mock/conversation";

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

export function useChatMemory(enabled: boolean) {
  const [entries, setEntries] = useState<ChatMemoryEntry[]>(() => (enabled ? readMemory() : []));

  function remember(topic: ChatTopic) {
    if (!enabled || topic === "inicio" || topic === "conversación") return;
    setEntries((current) => {
      if (current.length && current[current.length - 1].topic === topic) return current;
      const next = [...current, { topic, at: Date.now() }].slice(-MAX_ENTRIES);
      writeMemory(next);
      return next;
    });
  }

  function clear() {
    writeMemory([]);
    setEntries([]);
  }

  return { entries, remember, clear };
}
