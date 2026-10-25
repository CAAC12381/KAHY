import { useEffect, useState } from "react";
import { isDayKey, toDayKey } from "../lib/dayKey";
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

export type { Habit } from "../lib/habitCatalog";

/** Hábitos completados por día: { "2026-10-24": ["water", "custom-…"] } */
export type HabitHistory = Record<string, string[]>;

export type AddHabitResult =
  | { ok: true; habit: Habit }
  | { ok: false; reason: "empty" | "duplicate" | "limit" };

const HISTORY_KEY = "kahy.daily-habits.v2";
const LEGACY_KEY = "kahy.daily-habits.v1";
const CUSTOM_KEY = "kahy.custom-habits.v1";
const REWARD_KEY = "kahy.habit-rewards.v1";
const MAX_DAYS = 120;
const MAX_STORED_CUSTOM = 60;

// ---------- lectura y guardado seguros ----------

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

function readCustomHabits(): Habit[] {
  const data = readJson(CUSTOM_KEY);
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

function pruneHistory(history: HabitHistory): HabitHistory {
  const keys = Object.keys(history)
    .filter((key) => history[key].length > 0)
    .sort()
    .slice(-MAX_DAYS);
  return Object.fromEntries(keys.map((key) => [key, history[key]]));
}

function readHistory(validIds: Set<string>): HabitHistory {
  const clean = (ids: unknown) =>
    Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string" && validIds.has(id)))] : [];

  const data = readJson(HISTORY_KEY);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>)
      .filter(([key]) => isDayKey(key))
      .map(([key, ids]) => [key, clean(ids)] as const);
    return pruneHistory(Object.fromEntries(entries));
  }
  // Migración desde v1, que solo guardaba el día actual.
  const legacy = readJson(LEGACY_KEY) as { date?: unknown; completed?: unknown } | null;
  if (legacy && isDayKey(legacy.date)) return pruneHistory({ [legacy.date]: clean(legacy.completed) });
  return {};
}

/** Hábitos que ya dieron puntos hoy (evita ganar puntos al desmarcar y volver a marcar). */
type Rewards = { date: string; ids: string[] };

function readRewards(): Rewards {
  const data = readJson(REWARD_KEY) as { date?: unknown; ids?: unknown } | null;
  if (!data || !isDayKey(data.date) || !Array.isArray(data.ids)) return { date: "", ids: [] };
  return { date: data.date, ids: data.ids.filter((id): id is string => typeof id === "string") };
}

function makeId() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `custom-${random}`;
}

// ---------- hook ----------

/**
 * Hábitos del día con historial, hábitos personalizados y sugerencias.
 * Solo el día de hoy se puede modificar; los días anteriores son de consulta.
 */
export function useDailyHabits(onComplete: () => void) {
  const [todayKey, setTodayKey] = useState(() => toDayKey(new Date()));
  const [customHabits, setCustomHabits] = useState<Habit[]>(readCustomHabits);
  const [history, setHistory] = useState<HabitHistory>(() =>
    readHistory(new Set([...defaultHabits, ...readCustomHabits()].map((habit) => habit.id))),
  );
  const [rewards, setRewards] = useState<Rewards>(readRewards);

  useEffect(() => {
    writeJson(HISTORY_KEY, history);
    try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* opcional */ }
  }, [history]);
  useEffect(() => writeJson(CUSTOM_KEY, customHabits), [customHabits]);
  useEffect(() => writeJson(REWARD_KEY, rewards), [rewards]);

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

  const allHabits = [...defaultHabits, ...customHabits];

  /** Hábitos que existían ese día, en orden: predeterminados y luego personalizados. */
  function habitsOn(dayKey: string): Habit[] {
    return allHabits.filter((habit) => isActiveOn(habit, dayKey));
  }

  /** Ids completados ese día, solo de hábitos que existían ese día. */
  function completedOn(dayKey: string): string[] {
    const ids = new Set(habitsOn(dayKey).map((habit) => habit.id));
    return (history[dayKey] ?? []).filter((id) => ids.has(id));
  }

  function progressOn(dayKey: string) {
    return { done: completedOn(dayKey).length, total: habitsOn(dayKey).length };
  }

  function toggle(id: string) {
    const key = toDayKey(new Date());
    if (!habitsOn(key).some((habit) => habit.id === id)) return;
    const wasDone = (history[key] ?? []).includes(id);
    setHistory((current) => {
      const done = current[key] ?? [];
      const next = done.includes(id) ? done.filter((entry) => entry !== id) : [...done, id];
      return pruneHistory({ ...current, [key]: next });
    });
    const rewardedToday = rewards.date === key ? rewards.ids : [];
    if (!wasDone && !rewardedToday.includes(id)) {
      setRewards({ date: key, ids: [...rewardedToday, id] });
      onComplete();
    }
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
    setHistory((current) => pruneHistory({ ...current, [todayKey]: (current[todayKey] ?? []).filter((entry) => entry !== id) }));
  }

  const todayLabels = new Set(habitsOn(todayKey).map((habit) => labelKey(habit.label)));

  return {
    todayKey,
    history,
    habitsOn,
    completedOn,
    progressOn,
    /** Hábitos completados hoy (compatibilidad con el uso anterior). */
    completed: completedOn(todayKey),
    toggle,
    addHabit,
    removeHabit,
    /** Sugerencias que todavía no están en la lista de hoy. */
    suggestions: habitSuggestions.filter((suggestion) => !todayLabels.has(labelKey(suggestion.label))),
    canAddMore: activeCustomCount < MAX_CUSTOM_HABITS,
    customRemaining: MAX_CUSTOM_HABITS - activeCustomCount,
  };
}

export type DailyHabitsApi = ReturnType<typeof useDailyHabits>;
