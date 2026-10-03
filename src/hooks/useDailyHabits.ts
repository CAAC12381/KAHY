import { useEffect, useState } from "react";
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

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDay(value: unknown): value is HabitDay {
  const day = value as HabitDay;
  return Boolean(day) && typeof day.date === "string" && Array.isArray(day.completed);
}

function readStore(): HabitStore {
  const fresh: HabitStore = { version: 2, days: [{ date: today(), completed: [] }] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as Partial<HabitStore> & Partial<HabitDay>;
    // Migra el formato v1, que solo conservaba el día actual.
    const storedDays = Array.isArray(data.days) ? data.days.filter(validDay) : validDay(data) ? [data] : [];
    const byDate = new Map(storedDays.map((day) => [day.date, { date: day.date, completed: day.completed.filter((id): id is string => typeof id === "string") }]));
    if (!byDate.has(today())) byDate.set(today(), { date: today(), completed: [] });
    return { version: 2, days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-60) };
  } catch {
    return fresh;
  }
}

function persist(store: HabitStore) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/** Daily self-care history: immediate local state plus a best-effort remote mirror. */
export function useDailyHabits(deviceId: string, onComplete: (habitId: string, date: string) => void) {
  const [store, setStore] = useState<HabitStore>(readStore);

  useEffect(() => persist(store), [store]);

  useEffect(() => {
    fetchRemoteHabitDays(deviceId).then((remote) => {
      if (!remote) return;
      setStore((local) => {
        const merged = new Map(local.days.map((day) => [day.date, day]));
        remote.filter(validDay).forEach((day) => {
          const current = merged.get(day.date);
          merged.set(day.date, { date: day.date, completed: [...new Set([...(current?.completed || []), ...day.completed])] });
        });
        if (!merged.has(today())) merged.set(today(), { date: today(), completed: [] });
        return { version: 2, days: [...merged.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-60) };
      });
    });
  }, [deviceId]);

  const currentDay = store.days.find((day) => day.date === today()) ?? { date: today(), completed: [] };

  function toggle(id: string) {
    const date = today();
    const isDone = currentDay.completed.includes(id);
    setStore((current) => {
      const existing = current.days.find((day) => day.date === date) ?? { date, completed: [] };
      const nextDay = { ...existing, completed: isDone ? existing.completed.filter((entry) => entry !== id) : [...existing.completed, id] };
      const days = [...current.days.filter((day) => day.date !== date), nextDay].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
      saveRemoteHabitDay(deviceId, nextDay);
      return { version: 2, days };
    });
    if (!isDone) onComplete(id, date);
  }

  function clear() {
    const fresh: HabitStore = { version: 2, days: [{ date: today(), completed: [] }] };
    setStore(fresh);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* almacenamiento opcional */ }
  }

  const activeDates = new Set(store.days.filter((day) => day.completed.length > 0).map((day) => day.date));
  let streak = 0;
  const cursor = new Date(`${today()}T12:00:00`);
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { completed: currentDay.completed, days: store.days, streak, toggle, clear };
}

export type DailyHabitsApi = ReturnType<typeof useDailyHabits>;
