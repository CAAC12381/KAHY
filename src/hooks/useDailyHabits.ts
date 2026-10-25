import { useEffect, useState } from "react";
import { fromDayKey, isDayKey, toDayKey } from "../lib/dayKey";
import {
  defaultHabits,
  habitIconKeys,
  habitSuggestions,
  isActiveOn,
  labelKey,
  MAX_CUSTOM_HABITS,
  normalizeLabel,
  type Habit,
  type HabitIcon,
} from "../lib/habitCatalog";
import { fetchRemoteHabitDays, saveRemoteHabitDay } from "../services/dataApi";

export type { Habit } from "../lib/habitCatalog";

/** Hábitos predeterminados. Los de cada día, con los personalizados, salen de habitsOn(). */
export const dailyHabits: Habit[] = defaultHabits;

export type HabitDay = { date: string; completed: string[] };
type HabitStore = { version: 2; days: HabitDay[] };

export type AddHabitResult =
  | { ok: true; habit: Habit }
  | { ok: false; reason: "empty" | "duplicate" | "limit" };

const STORAGE_KEY = "kahy.daily-habits.v1";
/** Historial { "2026-10-24": ["water"] } que guardó el calendario unificado en main; se migra una vez. */
const HISTORY_KEY = "kahy.daily-habits.v2";
/** Hábitos creados por la persona. Su historial viaja con los días; la lista vive en este dispositivo. */
const CUSTOM_KEY = "kahy.custom-habits.v1";
const MAX_DAYS = 120;
const MAX_STORED_CUSTOM = 60;

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

function readCustomHabits(): Habit[] {
  try {
    const data = JSON.parse(window.localStorage.getItem(CUSTOM_KEY) || "[]") as unknown;
    if (!Array.isArray(data)) return [];
    const habits = data.flatMap((item): Habit[] => {
      if (!item || typeof item !== "object") return [];
      const raw = item as Record<string, unknown>;
      const label = typeof raw.label === "string" ? normalizeLabel(raw.label) : "";
      if (typeof raw.id !== "string" || !raw.id.startsWith("custom-") || !label || !isDayKey(raw.createdOn)) return [];
      const icon = habitIconKeys.includes(raw.icon as HabitIcon) ? (raw.icon as HabitIcon) : "custom";
      return [{ id: raw.id, label, icon, custom: true, createdOn: raw.createdOn, removedOn: isDayKey(raw.removedOn) ? raw.removedOn : undefined }];
    });
    return pruneCustom(habits);
  } catch {
    return [];
  }
}

/** Conserva todos los activos y solo los archivados más recientes. */
function pruneCustom(habits: Habit[]): Habit[] {
  const active = habits.filter((habit) => !habit.removedOn);
  const archived = habits
    .filter((habit) => habit.removedOn)
    .sort((a, b) => (b.removedOn ?? "").localeCompare(a.removedOn ?? ""))
    .slice(0, Math.max(0, MAX_STORED_CUSTOM - active.length));
  return [...active, ...archived];
}

function makeId() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `custom-${random}`;
}

/**
 * Daily self-care history: immediate local state plus a best-effort remote mirror.
 * Incluye hábitos personalizados y sugerencias. Solo el día de hoy se puede
 * modificar; los días anteriores son de consulta.
 */
export function useDailyHabits(deviceId: string, onComplete: (habitId: string, date: string) => void) {
  const [store, setStore] = useState<HabitStore>(readStore);
  const [customHabits, setCustomHabits] = useState<Habit[]>(readCustomHabits);
  const [todayKey, setTodayKey] = useState(today);

  useEffect(() => persist(store), [store]);

  useEffect(() => {
    try { window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customHabits)); } catch { /* almacenamiento opcional */ }
  }, [customHabits]);

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

  const allHabits = [...defaultHabits, ...customHabits];

  /** Hábitos que existían ese día, en orden: predeterminados y luego personalizados. */
  function habitsOn(dayKey: string): Habit[] {
    return allHabits.filter((habit) => isActiveOn(habit, dayKey));
  }

  /** Ids completados ese día, solo de hábitos que existían ese día. */
  function completedOn(dayKey: string): string[] {
    const ids = new Set(habitsOn(dayKey).map((habit) => habit.id));
    return (store.days.find((day) => day.date === dayKey)?.completed ?? []).filter((id) => ids.has(id));
  }

  function progressOn(dayKey: string) {
    return { done: completedOn(dayKey).length, total: habitsOn(dayKey).length };
  }

  /** Cambia lo completado en un día y lo refleja en la copia remota. */
  function updateDay(date: string, change: (completed: string[]) => string[]) {
    setStore((current) => {
      const existing = current.days.find((day) => day.date === date) ?? { date, completed: [] };
      const nextDay = { date, completed: change(existing.completed) };
      saveRemoteHabitDay(deviceId, nextDay);
      return normalize([...current.days.filter((day) => day.date !== date), nextDay]);
    });
  }

  function toggle(id: string) {
    const date = today();
    if (!habitsOn(date).some((habit) => habit.id === id)) return;
    const isDone = completedOn(date).includes(id);
    updateDay(date, (completed) => (isDone ? completed.filter((entry) => entry !== id) : [...completed, id]));
    setTodayKey(date);
    if (!isDone) onComplete(id, date);
  }

  const activeCustomCount = customHabits.filter((habit) => isActiveOn(habit, todayKey)).length;

  function addHabit(text: string, icon: HabitIcon = "custom"): AddHabitResult {
    const label = normalizeLabel(text);
    if (!label) return { ok: false, reason: "empty" };
    const key = labelKey(label);
    if (habitsOn(todayKey).some((habit) => labelKey(habit.label) === key)) return { ok: false, reason: "duplicate" };
    if (activeCustomCount >= MAX_CUSTOM_HABITS) return { ok: false, reason: "limit" };
    const habit: Habit = { id: makeId(), label, icon, custom: true, createdOn: todayKey };
    setCustomHabits((current) => pruneCustom([...current, habit]));
    return { ok: true, habit };
  }

  /** Quita un hábito personalizado desde hoy. El historial de días anteriores no cambia. */
  function removeHabit(id: string) {
    const habit = customHabits.find((item) => item.id === id);
    if (!habit || !isActiveOn(habit, todayKey)) return;
    setCustomHabits((current) =>
      habit.createdOn === todayKey
        ? current.filter((item) => item.id !== id) // creado hoy: se borra sin dejar rastro
        : current.map((item) => (item.id === id ? { ...item, removedOn: todayKey } : item)),
    );
    if (completedOn(todayKey).includes(id)) updateDay(todayKey, (completed) => completed.filter((entry) => entry !== id));
  }

  function clear() {
    setStore(normalize([]));
    setCustomHabits([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(HISTORY_KEY);
      window.localStorage.removeItem(CUSTOM_KEY);
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

  const todayLabels = new Set(habitsOn(todayKey).map((habit) => labelKey(habit.label)));

  return {
    todayKey,
    habitsOn,
    completedOn,
    progressOn,
    /** Hábitos completados hoy. */
    completed: completedOn(todayKey),
    days: store.days,
    streak,
    toggle,
    addHabit,
    removeHabit,
    /** Sugerencias que todavía no están en la lista de hoy. */
    suggestions: habitSuggestions.filter((suggestion) => !todayLabels.has(labelKey(suggestion.label))),
    canAddMore: activeCustomCount < MAX_CUSTOM_HABITS,
    customRemaining: MAX_CUSTOM_HABITS - activeCustomCount,
    clear,
    uploadAll,
  };
}

export type DailyHabitsApi = ReturnType<typeof useDailyHabits>;
