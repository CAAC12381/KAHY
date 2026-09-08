import { useState } from "react";

export type Habit = { id: string; label: string };

export const dailyHabits: Habit[] = [
  { id: "water", label: "Tomar agua" },
  { id: "move", label: "Moverme 5 minutos" },
  { id: "screen-break", label: "Un momento sin pantallas" },
  { id: "mood-note", label: "Anotar cómo me siento" },
];

type HabitState = { date: string; completed: string[] };

const STORAGE_KEY = "kahy.daily-habits.v1";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readState(): HabitState {
  const fresh: HabitState = { date: today(), completed: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as Partial<HabitState>;
    if (data.date !== fresh.date || !Array.isArray(data.completed)) return fresh;
    return { date: fresh.date, completed: data.completed.filter((id): id is string => typeof id === "string") };
  } catch {
    return fresh;
  }
}

function persist(state: HabitState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/** A short, local-only checklist of self-care habits that resets every calendar day. */
export function useDailyHabits(onComplete: () => void) {
  const [state, setState] = useState<HabitState>(readState);

  function toggle(id: string) {
    setState((current) => {
      const isDone = current.completed.includes(id);
      const next = { date: current.date, completed: isDone ? current.completed.filter((entry) => entry !== id) : [...current.completed, id] };
      persist(next);
      return next;
    });
    if (!state.completed.includes(id)) onComplete();
  }

  return { completed: state.completed, toggle };
}
