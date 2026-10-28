import { useEffect, useMemo, useState } from "react";
import { mirrorCompanions, mirrorThemes, practiceDay, type MirrorTheme } from "../data/companionMirror";
import type { MascotId } from "../types";

/**
 * Lo que recuerda "Lo que le dirías a alguien que quieres", solo en este
 * dispositivo (nunca se envía al servidor, con o sin cuenta):
 * - sessions: con qué compañero se practicó cada día (para el calendario).
 * - moments: el tema general de lo que se contó en el chat ("escuela"),
 *   nunca el texto, para practicarlo después desde el calendario.
 * - phrases: las frases que la persona decidió guardar.
 */

const STORAGE_KEY = "kahy.mirror-journal.v1";

export type MirrorSession = { day: string; companion: MascotId };
export type MirrorMoment = { day: string; theme: MirrorTheme; at: number };
export type SavedPhrase = { id: string; text: string; situationId: string; at: number };
type Journal = { sessions: MirrorSession[]; moments: MirrorMoment[]; phrases: SavedPhrase[] };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function readJournal(): Journal {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Partial<Journal> & { practiced?: unknown };
    const sessions = Array.isArray(value.sessions) ? value.sessions.filter((item) => item && DAY.test(item.day) && item.companion in mirrorCompanions) : [];
    // Antes solo se guardaba el día (y solo existía Moka).
    if (Array.isArray(value.practiced)) {
      value.practiced.forEach((day) => {
        if (typeof day === "string" && DAY.test(day) && !sessions.some((item) => item.day === day)) sessions.push({ day, companion: "vaca" });
      });
    }
    return {
      sessions,
      moments: Array.isArray(value.moments) ? value.moments.filter((item) => item && DAY.test(item.day) && item.theme in mirrorThemes) : [],
      phrases: Array.isArray(value.phrases) ? value.phrases.filter((item) => item && typeof item.text === "string" && typeof item.id === "string") : [],
    };
  } catch {
    return { sessions: [], moments: [], phrases: [] };
  }
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useMirrorJournal() {
  const [journal, setJournal] = useState<Journal>(readJournal);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journal)); } catch { /* almacenamiento opcional */ }
  }, [journal]);

  const practicedDays = useMemo(() => [...new Set(journal.sessions.map((item) => item.day))], [journal.sessions]);

  /** Se consoló hoy a este compañero. */
  function markPracticed(companion: MascotId) {
    const day = practiceDay();
    setJournal((current) => current.sessions.some((item) => item.day === day && item.companion === companion)
      ? current
      : { ...current, sessions: [...current.sessions, { day, companion }].slice(-500) });
  }

  /** En el chat se contó algo de este tema (una vez por día y tema). */
  function noteMoment(theme: MirrorTheme) {
    const day = practiceDay();
    setJournal((current) => current.moments.some((item) => item.day === day && item.theme === theme)
      ? current
      : { ...current, moments: [...current.moments, { day, theme, at: Date.now() }].slice(-200) });
  }

  function savePhrase(text: string, situationId: string) {
    const clean = text.trim();
    if (!clean) return;
    setJournal((current) => current.phrases.some((item) => item.text === clean)
      ? current
      : { ...current, phrases: [...current.phrases, { id: makeId(), text: clean, situationId, at: Date.now() }].slice(-100) });
  }

  function removePhrase(id: string) {
    setJournal((current) => ({ ...current, phrases: current.phrases.filter((item) => item.id !== id) }));
  }

  function clear() {
    setJournal({ sessions: [], moments: [], phrases: [] });
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* almacenamiento opcional */ }
  }

  return {
    /** Días (AAAA-MM-DD) en que se practicó con algún compañero. */
    practicedDays,
    sessions: journal.sessions,
    moments: journal.moments,
    phrases: journal.phrases,
    markPracticed,
    noteMoment,
    savePhrase,
    removePhrase,
    clear,
  };
}

export type MirrorJournalApi = ReturnType<typeof useMirrorJournal>;
