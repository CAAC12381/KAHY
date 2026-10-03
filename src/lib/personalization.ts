import type { HabitDay } from "../hooks/useDailyHabits";
import type { DemoProfile, EmotionEntry, Preferences, ScreeningResult, TaskPlan } from "../types";
import { dailyHabits } from "../hooks/useDailyHabits";
import { emotionLabels } from "./emotionLexicon";

export type AdaptiveHighlights = {
  preferredName?: string;
  lowStimuli: boolean;
  activeTask?: string;
  activeTaskProgress?: string;
  completedHabits: number;
  totalHabits: number;
  habitStreak: number;
  recentEmotion?: string;
  dominantEmotion?: string;
  completedTasks: number;
  companionGrowth: number;
};

export type AdaptiveContext = {
  summary?: string;
  highlights: AdaptiveHighlights;
  connectedSignals: number;
};

type Input = {
  profile: DemoProfile;
  preferences: Preferences;
  recentTopics: string[];
  screenings: ScreeningResult[];
  emotions: EmotionEntry[];
  tasks: TaskPlan[];
  habitDays: HabitDay[];
  habitStreak: number;
  companionGrowth: number;
  companionName?: string;
};

const screeningNames: Record<ScreeningResult["id"], string> = {
  phq9: "PHQ-9",
  gad7: "GAD-7",
  asrs: "ASRS",
  pcl5: "PCL-5",
};

/** Builds a compact, inspectable summary. It never includes archived chat transcripts. */
export function buildAdaptiveContext(input: Input): AdaptiveContext {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayHabits = input.habitDays.find((day) => day.date === today)?.completed ?? [];
  const activeTasks = input.tasks.filter((plan) => !plan.completedAt);
  const completedTasks = input.tasks.length - activeTasks.length;
  const currentTask = [...activeTasks].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const currentDone = currentTask?.steps.filter((step) => step.done).length ?? 0;
  const currentTotal = currentTask?.steps.filter((step) => step.text.trim()).length ?? 0;
  const recentEmotions = input.emotions.slice(-10).filter((entry) => entry.primary !== "neutral" && entry.primary !== "no_clara");
  const emotionCounts = new Map<string, number>();
  recentEmotions.forEach((entry) => emotionCounts.set(entry.primary, (emotionCounts.get(entry.primary) || 0) + 1));
  const dominant = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionEntry["primary"] | undefined;
  const latestEmotion = recentEmotions.at(-1)?.primary;
  const latestScreenings = new Map<ScreeningResult["id"], ScreeningResult>();
  input.screenings.forEach((result) => latestScreenings.set(result.id, result));

  const highlights: AdaptiveHighlights = {
    preferredName: input.profile.name !== "Invitado" ? input.profile.name : undefined,
    lowStimuli: input.preferences.lowStimuli,
    activeTask: currentTask?.title,
    activeTaskProgress: currentTask ? `${currentDone}/${currentTotal}` : undefined,
    completedHabits: todayHabits.length,
    totalHabits: dailyHabits.length,
    habitStreak: input.habitStreak,
    recentEmotion: latestEmotion ? emotionLabels[latestEmotion] : undefined,
    dominantEmotion: dominant ? emotionLabels[dominant] : undefined,
    completedTasks,
    companionGrowth: input.companionGrowth,
  };

  if (!input.preferences.adaptivePersonalization) return { highlights, connectedSignals: 0 };

  const parts: string[] = [];
  if (highlights.preferredName) parts.push(`nombre preferido: ${highlights.preferredName}`);
  if (input.profile.goals.length) parts.push(`metas declaradas: ${input.profile.goals.slice(0, 4).join(", ")}`);
  if (input.preferences.lowStimuli || input.preferences.simplified) {
    parts.push(`preferencias de interacción: ${[input.preferences.lowStimuli && "bajo estímulo", input.preferences.simplified && "explicaciones simples"].filter(Boolean).join(", ")}`);
  }
  if (input.recentTopics.length) parts.push(`temas recientes: ${[...new Set(input.recentTopics)].slice(-4).join(", ")}`);
  if (recentEmotions.length) {
    const progress = recentEmotions.at(-1)?.progress.replace("_", " ");
    parts.push(`señales emocionales recientes: ${recentEmotions.slice(-4).map((entry) => emotionLabels[entry.primary]).join(", ")}; último avance: ${progress}`);
  }
  if (todayHabits.length) {
    const labels = todayHabits.map((id) => dailyHabits.find((habit) => habit.id === id)?.label).filter(Boolean);
    parts.push(`hábitos de hoy: ${labels.join(", ")}${input.habitStreak > 1 ? `; racha de ${input.habitStreak} días` : ""}`);
  }
  if (currentTask) {
    const next = currentTask.steps.find((step) => !step.done && step.text.trim());
    parts.push(`tarea activa: ${currentTask.title}; avance ${currentDone} de ${currentTotal}${next ? `; siguiente paso: ${next.text}` : ""}`);
  }
  if (completedTasks) parts.push(`tareas terminadas: ${completedTasks}`);
  if (latestScreenings.size) {
    parts.push(`autoinformes recientes, no diagnósticos: ${[...latestScreenings.values()].map((result) => `${screeningNames[result.id]}: ${result.band}`).join("; ")}`);
  }
  if (input.companionName) parts.push(`compañero simbólico: ${input.companionName}; crecimiento ${input.companionGrowth}%`);

  return { summary: parts.join(". ").slice(0, 1800), highlights, connectedSignals: parts.length };
}
