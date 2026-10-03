import { useEffect, useRef, useState } from "react";
import { deleteRemoteTaskPlan, fetchRemoteTaskPlans, saveRemoteTaskPlan } from "../services/dataApi";
import type { EmotionName, TaskEnergy, TaskPlan, TaskPlanSource, TaskStep } from "../types";

const STORAGE_KEY = "kahy.task-plans.v1";
const MAX_PLANS = 30;
export const MAX_STEPS = 12;

function isPlan(value: unknown): value is TaskPlan {
  const plan = value as TaskPlan;
  return Boolean(plan) && typeof plan.id === "string" && typeof plan.title === "string" && typeof plan.updatedAt === "number" && Array.isArray(plan.steps);
}

function readPlans(): TaskPlan[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
    return Array.isArray(value) ? value.filter(isPlan).slice(-MAX_PLANS) : [];
  } catch {
    return [];
  }
}

function persist(plans: TaskPlan[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch { /* almacenamiento opcional */ }
}

export function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeStep(text: string, minutes?: number): TaskStep {
  return { id: makeId(), text, minutes, done: false };
}

/**
 * Planes de "Desglosar una tarea". Igual que el calendario emocional:
 * localStorage es la fuente de verdad inmediata y la base de datos es un
 * respaldo en segundo plano (si no está configurada, todo sigue funcionando).
 */
export function useTaskPlans(deviceId: string) {
  const [plans, setPlans] = useState<TaskPlan[]>(readPlans);
  const pendingSaves = useRef(new Map<string, number>());

  useEffect(() => persist(plans), [plans]);

  /** Agrupa los cambios rápidos (como escribir un paso) en un solo respaldo remoto. */
  function scheduleRemoteSave(plan: TaskPlan) {
    window.clearTimeout(pendingSaves.current.get(plan.id));
    pendingSaves.current.set(plan.id, window.setTimeout(() => {
      pendingSaves.current.delete(plan.id);
      saveRemoteTaskPlan(deviceId, plan);
    }, 900));
  }

  useEffect(() => {
    fetchRemoteTaskPlans(deviceId).then((remote) => {
      if (!remote) return;
      setPlans((local) => {
        const merged = new Map(local.map((plan) => [plan.id, plan]));
        remote.filter(isPlan).forEach((plan) => {
          const current = merged.get(plan.id);
          if (!current || current.updatedAt < plan.updatedAt) merged.set(plan.id, plan);
        });
        return [...merged.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-MAX_PLANS);
      });
    });
  }, [deviceId]);

  function create(input: { title: string; energy: TaskEnergy; source: TaskPlanSource; steps: TaskStep[]; feelingBefore?: EmotionName }): TaskPlan {
    const now = Date.now();
    const plan: TaskPlan = { id: makeId(), createdAt: now, updatedAt: now, ...input, steps: input.steps.slice(0, MAX_STEPS) };
    setPlans((current) => [...current, plan].slice(-MAX_PLANS));
    saveRemoteTaskPlan(deviceId, plan);
    return plan;
  }

  /** Aplica un cambio, recalcula si el plan quedó terminado y lo respalda. */
  function update(id: string, change: (plan: TaskPlan) => TaskPlan) {
    setPlans((current) => current.map((plan) => {
      if (plan.id !== id) return plan;
      const next = change(plan);
      // Los pasos vacíos (recién añadidos y sin texto) no impiden terminar el plan.
      const written = next.steps.filter((step) => step.text.trim());
      const allDone = written.length > 0 && written.every((step) => step.done);
      const updated: TaskPlan = { ...next, steps: next.steps.slice(0, MAX_STEPS), updatedAt: Date.now(), completedAt: allDone ? next.completedAt ?? Date.now() : undefined };
      scheduleRemoteSave(updated);
      return updated;
    }));
  }

  function remove(id: string) {
    window.clearTimeout(pendingSaves.current.get(id));
    pendingSaves.current.delete(id);
    setPlans((current) => current.filter((plan) => plan.id !== id));
    deleteRemoteTaskPlan(deviceId, id);
  }

  function clear() {
    pendingSaves.current.forEach((timer) => window.clearTimeout(timer));
    pendingSaves.current.clear();
    setPlans([]);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* almacenamiento opcional */ }
    deleteRemoteTaskPlan(deviceId);
  }

  const active = plans.filter((plan) => !plan.completedAt);
  return { plans, active, create, update, remove, clear };
}

export type TaskPlansApi = ReturnType<typeof useTaskPlans>;
