import { useEffect, useState } from "react";
import { clearRemoteEmotions, fetchRemoteEmotions, saveRemoteEmotion } from "../services/dataApi";
import type { EmotionEntry, EmotionInsight, EmotionName, EmotionIntensity, EmotionalProgress } from "../types";

const STORAGE_KEY = "kahy.emotion-calendar.v1";
const validEmotions = new Set<EmotionName>(["alegría", "calma", "alivio", "esperanza", "tristeza", "ansiedad", "miedo", "enojo", "frustración", "culpa", "soledad", "cansancio", "confusión", "agobio", "neutral"]);

function readEntries(): EmotionEntry[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as EmotionEntry[];
    return Array.isArray(value) ? value.filter((entry) => entry && validEmotions.has(entry.primary) && typeof entry.at === "number").slice(-180) : [];
  } catch {
    return [];
  }
}

function persist(entries: EmotionEntry[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* almacenamiento opcional */ }
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useEmotionCalendar(deviceId: string) {
  const [entries, setEntries] = useState<EmotionEntry[]>(readEntries);

  useEffect(() => persist(entries), [entries]);

  useEffect(() => {
    fetchRemoteEmotions(deviceId).then((remote) => {
      if (!remote) return;
      setEntries((local) => {
        const merged = new Map(local.map((entry) => [entry.id, entry]));
        remote.forEach((entry) => {
          if (validEmotions.has(entry.primary as EmotionName)) merged.set(entry.id, entry as EmotionEntry);
        });
        return [...merged.values()].sort((a, b) => a.at - b.at).slice(-180);
      });
    });
  }, [deviceId]);

  function record(insight: EmotionInsight) {
    if (!validEmotions.has(insight.primary) || insight.confidence === "baja" || insight.progress === "sin_señal") return;
    const entry: EmotionEntry = { ...insight, id: makeId(), at: Date.now() };
    setEntries((current) => [...current, entry].slice(-180));
    saveRemoteEmotion(deviceId, entry);
  }

  function clear() {
    setEntries([]);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* almacenamiento opcional */ }
    clearRemoteEmotions(deviceId);
  }

  return {
    entries,
    latest: entries.length ? entries[entries.length - 1] : null,
    record,
    clear,
  };
}

export type EmotionCalendarApi = ReturnType<typeof useEmotionCalendar>;
export type { EmotionName, EmotionIntensity, EmotionalProgress };
