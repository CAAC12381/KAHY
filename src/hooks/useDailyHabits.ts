import { useEffect, useState } from "react";
import { isDayKey, toDayKey } from "../lib/dayKey";

export type Habit = { id: string; label: string };

export const dailyHabits: Habit[] = [
  { id: "water", label: "Tomar agua" },
  { id: "move", label: "Moverme 5 minutos" },
  { id: "screen-break", label: "Un momento sin pantallas" },
  { id: "mood-note", label: "Anotar cómo me siento" },
];

/** Hábitos completados por día: { "2026-10-24": ["water", "move"] } */
export type HabitHistory = Record<string, string[]>;

const STORAGE_KEY = "kahy.daily-habits.v2";
const LEGACY_KEY = "kahy.daily-habits.v1";
const MAX_DAYS = 120;
const validIds = new Set(dailyHabits.map((habit) => habit.id));

function sanitize(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && validIds.has(id)))];
}

/** Quita días vacíos y conserva solo los MAX_DAYS más recientes. */
function prune(history: HabitHistory): HabitHistory {
  const keys = Object.keys(history)
    .filter((key) => history[key].length > 0)
    .sort()
    .slice(-MAX_DAYS);
  return Object.fromEntries(keys.map((key) => [key, history[key]]));
}

function readHistory(): HabitHistory {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as unknown;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const entries = Object.entries(data as Record<string, unknown>)
          .filter(([key]) => isDayKey(key))
          .map(([key, ids]) => [key, sanitize(ids)] as const);
        return prune(Object.fromEntries(entries));
      }
    }
    // Migración desde v1, que solo guardaba el día actual.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = JSON.parse(legacy) as { date?: unknown; completed?: unknown };
      if (isDayKey(data.date)) return prune({ [data.date]: sanitize(data.completed) });
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: empezamos limpio.
  }
  return {};
}

function persist(history: HabitHistory) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/**
 * Checklist local de hábitos con historial por día.
 * Solo el día de hoy se puede marcar; los días anteriores son de consulta.
 */
export function useDailyHabits(onComplete: () => void) {
  const [history, setHistory] = useState<HabitHistory>(readHistory);
  const [todayKey, setTodayKey] = useState(() => toDayKey(new Date()));

  useEffect(() => persist(history), [history]);

  // Si la app queda abierta pasada la medianoche, "hoy" se actualiza solo.
  useEffect(() => {
    const sync = () => setTodayKey(toDayKey(new Date()));
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  function completedOn(dayKey: string): string[] {
    return history[dayKey] ?? [];
  }

  function toggle(id: string) {
    if (!validIds.has(id)) return;
    const key = toDayKey(new Date());
    const wasDone = completedOn(key).includes(id);
    setHistory((current) => {
      const done = current[key] ?? [];
      const next = done.includes(id) ? done.filter((entry) => entry !== id) : [...done, id];
      return prune({ ...current, [key]: next });
    });
    if (!wasDone) onComplete();
  }

  return {
    habits: dailyHabits,
    todayKey,
    history,
    /** Hábitos completados hoy (compatibilidad con el uso anterior). */
    completed: completedOn(todayKey),
    completedOn,
    toggle,
  };
}

export type DailyHabitsApi = ReturnType<typeof useDailyHabits>;
