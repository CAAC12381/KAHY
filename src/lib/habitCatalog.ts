/** Catálogo de hábitos: los predeterminados, las sugerencias y las reglas para los personalizados. */

export type HabitIcon =
  | "water"
  | "move"
  | "screen"
  | "note"
  | "breath"
  | "stretch"
  | "gratitude"
  | "tea"
  | "sun"
  | "read"
  | "talk"
  | "sleep"
  | "custom";

export type Habit = {
  id: string;
  label: string;
  icon: HabitIcon;
  /** true para hábitos creados por la persona (se pueden quitar). */
  custom?: boolean;
  /** Día (YYYY-MM-DD) desde el que aparece. Sin valor = siempre. */
  createdOn?: string;
  /** Día desde el que ya no aparece. Los días anteriores conservan su historial. */
  removedOn?: string;
};

export type HabitSuggestion = { label: string; icon: HabitIcon };

export const MAX_CUSTOM_HABITS = 8;
export const MAX_HABIT_LABEL = 40;

export const defaultHabits: Habit[] = [
  { id: "water", label: "Tomar agua", icon: "water" },
  { id: "move", label: "Moverme 5 minutos", icon: "move" },
  { id: "screen-break", label: "Un momento sin pantallas", icon: "screen" },
  { id: "mood-note", label: "Anotar cómo me siento", icon: "note" },
];

export const habitSuggestions: HabitSuggestion[] = [
  { label: "Respiración profunda (2 min)", icon: "breath" },
  { label: "Estirar el cuerpo", icon: "stretch" },
  { label: "Agradecer algo hoy", icon: "gratitude" },
  { label: "Tomar té o agua", icon: "tea" },
  { label: "Salir a tomar el sol", icon: "sun" },
  { label: "Leer 10 minutos", icon: "read" },
  { label: "Hablar con alguien de confianza", icon: "talk" },
  { label: "Dormir a mi hora", icon: "sleep" },
];

export const habitIconKeys: HabitIcon[] = [
  "water", "move", "screen", "note", "breath", "stretch", "gratitude", "tea", "sun", "read", "talk", "sleep", "custom",
];

/** Limpia espacios y recorta al largo máximo. */
export function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_HABIT_LABEL);
}

/** Clave para detectar duplicados sin importar mayúsculas ni acentos. */
export function labelKey(text: string): string {
  return normalizeLabel(text)
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isActiveOn(habit: Habit, dayKey: string): boolean {
  if (habit.createdOn && habit.createdOn > dayKey) return false;
  if (habit.removedOn && habit.removedOn <= dayKey) return false;
  return true;
}
