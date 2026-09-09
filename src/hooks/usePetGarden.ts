import { useEffect, useState } from "react";
import type { PetMood } from "../types";
import { fetchRemotePetGarden, saveRemotePetGarden } from "../services/dataApi";

export type CareAction = "food" | "play" | "love" | "water" | "sun" | "prune";

type PetGardenState = {
  happiness: number;
  bond: number;
  careCounts: Record<CareAction, number>;
  lastCare: number;
  /** Unified growth progress, in points, shared by care actions, daily habits and chat. */
  progress: number;
};

const STORAGE_KEY = "kahy.pet-garden.v1";
const NEGLECT_WINDOW = 24 * 60 * 60 * 1000;
/** Total points needed to go from newborn (0%) to fully grown (100%). */
const GROWTH_TARGET_POINTS = 30;

/** How many growth points each kind of interaction contributes. */
const PROGRESS_POINTS = {
  care: 3,
  habit: 4,
  chat: 1,
} as const;

const defaultState: PetGardenState = {
  happiness: 70,
  bond: 12,
  careCounts: { food: 0, play: 0, love: 0, water: 0, sun: 0, prune: 0 },
  lastCare: Date.now(),
  progress: 0,
};

function readState(): PetGardenState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const data = JSON.parse(raw) as Partial<PetGardenState>;
    if (!data.careCounts) return defaultState;
    const careCounts = { ...defaultState.careCounts, ...data.careCounts };
    // Perfiles guardados antes de que existiera `progress`: lo reconstruimos desde el cuidado ya acumulado, para no reiniciar el crecimiento de nadie.
    const totalCare = Object.values(careCounts).reduce((sum, count) => sum + count, 0);
    const progress = typeof data.progress === "number" ? data.progress : totalCare * PROGRESS_POINTS.care;
    return { ...defaultState, ...data, careCounts, progress: Math.min(GROWTH_TARGET_POINTS, progress) };
  } catch {
    return defaultState;
  }
}

function persist(state: PetGardenState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

const careMessages: Record<CareAction, string> = {
  food: "Gracias por alimentarme, me da energía para seguir creciendo contigo.",
  play: "¡Qué divertido! Jugar juntos también es una forma de cuidarnos.",
  love: "Me encanta cuando me dedicas un momento. Me siento acompañado.",
  water: "Gracias por regarme, el agua me ayuda a crecer fuerte.",
  sun: "¡Qué rico el sol! Me llena de energía para seguir floreciendo.",
  prune: "Gracias por cuidarme con atención, así puedo crecer mejor.",
};

const happinessGain: Record<CareAction, number> = {
  food: 8,
  play: 12,
  love: 8,
  water: 10,
  sun: 8,
  prune: 10,
};

const moodMessages: Record<string, string> = {
  "difícil": "Está bien tener un día difícil. Aquí me quedo contigo un momento.",
  "pesado": "Cuando todo pesa, un cuidado pequeño también cuenta. Gracias por estar aquí.",
  "neutral": "Los días neutrales también son válidos. Seguimos avanzando juntos.",
  "tranquilo": "Qué bien se siente esta calma. La disfruto contigo.",
  "bien": "Me alegra mucho verte así. ¡Gracias por compartirlo conmigo!",
};

/** Maps a 0-100 growth percent onto a 1-indexed stage for a companion with `stageCount` art stages. */
export function stageForGrowth(growthPercent: number, stageCount: number): number {
  const index = Math.min(stageCount - 1, Math.floor((growthPercent / 100) * stageCount));
  return index + 1;
}

export function usePetGarden(deviceId: string) {
  const [state, setState] = useState<PetGardenState>(readState);
  const [message, setMessage] = useState("Aquí estoy para acompañarte un ratito.");
  /** Bumped on every point gained, so any screen can trigger a one-off gain animation by watching it. */
  const [pulse, setPulse] = useState(0);

  useEffect(() => persist(state), [state]);

  useEffect(() => {
    fetchRemotePetGarden(deviceId).then((remote) => {
      if (!remote) return;
      setState((current) => ({
        ...current,
        happiness: remote.happiness,
        bond: remote.bond,
        progress: remote.progress,
        lastCare: remote.lastCare,
        careCounts: { ...current.careCounts, ...remote.careCounts },
      }));
    });
    // Una sola vez al montar: después de esto, este mismo estado local es la fuente de verdad para el resto de la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    saveRemotePetGarden(deviceId, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const isNeglected = Date.now() - state.lastCare > NEGLECT_WINDOW;
  const mood: PetMood = isNeglected ? "triste" : "feliz";
  const growth = Math.min(100, Math.round((state.progress / GROWTH_TARGET_POINTS) * 100));

  function addProgress(points: number) {
    setState((current) => ({ ...current, progress: Math.min(GROWTH_TARGET_POINTS, current.progress + points) }));
    setPulse((current) => current + 1);
  }

  function care(action: CareAction) {
    setState((current) => {
      const nextCounts = { ...current.careCounts, [action]: current.careCounts[action] + 1 };
      return {
        ...current,
        happiness: Math.min(100, current.happiness + happinessGain[action]),
        bond: Math.min(100, current.bond + 5),
        careCounts: nextCounts,
        lastCare: Date.now(),
        progress: Math.min(GROWTH_TARGET_POINTS, current.progress + PROGRESS_POINTS.care),
      };
    });
    setPulse((current) => current + 1);
    setMessage(careMessages[action]);
  }

  function reactToMood(moodValue: string) {
    setState((current) => ({ ...current, bond: Math.min(100, current.bond + 2) }));
    setMessage(moodMessages[moodValue] || "Gracias por contarme cómo te sientes hoy.");
  }

  /** Call when the user marks a daily habit as done. */
  function gainFromHabit() {
    setState((current) => ({ ...current, bond: Math.min(100, current.bond + 2) }));
    addProgress(PROGRESS_POINTS.habit);
    setMessage("¡Un hábito cumplido! Eso también me ayuda a crecer.");
  }

  /** Call when the user sends or receives a message in the chat de acompañamiento. */
  function gainFromChat() {
    addProgress(PROGRESS_POINTS.chat);
  }

  return {
    happiness: state.happiness,
    bond: state.bond,
    growth,
    mood,
    isNeglected,
    message,
    pulse,
    care,
    reactToMood,
    gainFromHabit,
    gainFromChat,
  };
}

export type PetGardenApi = ReturnType<typeof usePetGarden>;
