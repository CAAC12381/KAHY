import { useEffect, useState } from "react";
import { fromDayKey, isDayKey, toDayKey } from "../lib/dayKey";
import { fetchRemoteHabitDays, saveRemoteHabitDay } from "../services/dataApi";

export type Habit = { id: string; label: string };

export const dailyHabits: Habit[] = [
  { id: "water", label: "Tomar agua" },
  { id: "move", label: "Moverme 5 minutos" },
  { id: "screen-break", label: "Un momento sin pantallas" },
  { id: "mood-note", label: "Anotar cómo me siento" },
];

export type HabitDay = { date: string; completed: string[] };
type HabitStore = { version: 2; days: HabitDay[] };

const STORAGE_KEY = "kahy.daily-habits.v1";
/** Historial { "2026-10-24": ["water"] } que guardó el calendario unificado en main; se migra una vez. */
const HISTORY_KEY = "kahy.daily-habits.v2";
const MAX_DAYS = 120;

function today(): string {
  return toDayKey(new Date());
}

function validDay(value: unknown): value is HabitDay {
  const day = value as HabitDay;
  return Boolean(day) && typeof day.date === "string" && Array.isArray(day.completed);
}

/** Une días repetidos, ordena y conserva solo los MAX_DAYS más recientes (siempre con el de hoy). */
function normalize(days: HabitDay[]): HabitStore {
  const byDate = new Map<string, HabitDay>();
  days.forEach((day) => {
    const ids = day.completed.filter((id): id is string => typeof id === "string");
    byDate.set(day.date, { date: day.date, completed: [...new Set([...(byDate.get(day.date)?.completed || []), ...ids])] });
  });
  if (!byDate.has(today())) byDate.set(today(), { date: today(), completed: [] });
  return { version: 2, days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAYS) };
}

function readStore(): HabitStore {
  const days: HabitDay[] = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<HabitStore> & Partial<HabitDay>;
      // Migra el formato v1, que solo conservaba el día actual.
      days.push(...(Array.isArray(data.days) ? data.days.filter(validDay) : validDay(data) ? [data] : []));
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se ignoran.
  }
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const data = raw ? (JSON.parse(raw) as unknown) : null;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      Object.entries(data as Record<string, unknown>).forEach(([date, completed]) => {
        if (isDayKey(date) && Array.isArray(completed)) days.push({ date, completed });
      });
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se ignoran.
  }
  return normalize(days);
}

function persist(store: HabitStore) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    // Sus días ya quedaron en STORAGE_KEY; si se conservara, un hábito desmarcado volvería a aparecer.
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/**
 * Daily self-care history: immediate local state plus a best-effort remote mirror.
 * Solo el día de hoy se puede marcar; los días anteriores son de consulta.
 */
export function useDailyHabits(deviceId: string, onComplete: (habitId: string, date: string) => void) {
  const [store, setStore] = useState<HabitStore>(readStore);
  const [todayKey, setTodayKey] = useState(today);

  useEffect(() => persist(store), [store]);

  // Si la app queda abierta pasada la medianoche, "hoy" se actualiza solo.
  useEffect(() => {
    const sync = () => setTodayKey(today());
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    fetchRemoteHabitDays(deviceId).then((remote) => {
      if (!remote) return;
      setStore((local) => normalize([...local.days, ...remote.filter(validDay)]));
    });
  }, [deviceId]);

  function completedOn(dayKey: string): string[] {
    return store.days.find((day) => day.date === dayKey)?.completed ?? [];
  }

  function toggle(id: string) {
    const date = today();
    const isDone = completedOn(date).includes(id);
    setStore((current) => {
      const existing = current.days.find((day) => day.date === date) ?? { date, completed: [] };
      const nextDay = { ...existing, completed: isDone ? existing.completed.filter((entry) => entry !== id) : [...existing.completed, id] };
      saveRemoteHabitDay(deviceId, nextDay);
      return normalize([...current.days.filter((day) => day.date !== date), nextDay]);
    });
    setTodayKey(date);
    if (!isDone) onComplete(id, date);
  }

  function clear() {
    setStore(normalize([]));
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(HISTORY_KEY);
    } catch { /* almacenamiento opcional */ }
  }

  const activeDates = new Set(store.days.filter((day) => day.completed.length > 0).map((day) => day.date));
  let streak = 0;
  const cursor = fromDayKey(todayKey);
  while (activeDates.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  /** Al crear la cuenta: sube los días con hábitos que hasta ahora solo estaban en este dispositivo. */
  function uploadAll(accountDataId: string) {
    store.days.filter((day) => day.completed.length > 0).forEach((day) => saveRemoteHabitDay(accountDataId, day));
  }

  return {
    habits: dailyHabits,
    todayKey,
    /** Hábitos completados hoy. */
    completed: completedOn(todayKey),
    completedOn,
    days: store.days,
    streak,
    toggle,
    clear,
    uploadAll,
  };
}

export type DailyHabitsApi = ReturnType<typeof useDailyHabits>;
