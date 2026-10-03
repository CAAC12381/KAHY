import { localBreakdown, localSplitStep, type SuggestedStep } from "../lib/taskBreakdown";
import type { TaskEnergy } from "../types";

export type BreakdownResult =
  | { kind: "steps"; steps: SuggestedStep[]; encouragement: string; source: "ia" | "local" }
  | { kind: "safety" };

const localEncouragement = "Empieza solo por el primer paso. Lo demás puede esperar un momento.";

/**
 * Pide pasos a la IA y, si no está disponible (sin clave, sin conexión,
 * lenta o con error), responde con el motor local. Nunca lanza error.
 */
export async function requestBreakdown(task: string, energy: TaskEnergy, step?: string): Promise<BreakdownResult> {
  const fallback = (): BreakdownResult => ({ kind: "steps", steps: step ? localSplitStep(step) : localBreakdown(task, energy), encouragement: localEncouragement, source: "local" });
  if (!navigator.onLine) return fallback();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("/api/kahy/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ task, energy, step }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as { safety?: boolean; steps?: SuggestedStep[]; encouragement?: string };
    if (data.safety) return { kind: "safety" };
    if (!response.ok || !Array.isArray(data.steps) || data.steps.length < 2) return fallback();
    return { kind: "steps", steps: data.steps, encouragement: data.encouragement || localEncouragement, source: "ia" };
  } catch {
    return fallback();
  } finally {
    window.clearTimeout(timer);
  }
}
