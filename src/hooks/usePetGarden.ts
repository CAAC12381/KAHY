import { useEffect, useState } from "react";
import type { FlowerId, PetMood } from "../types";

export type CareAction = "food" | "play" | "love";

type PetGardenState = {
  version: 1;
  flowerId: FlowerId;
  happiness: number;
  bond: number;
  careCounts: Record<CareAction, number>;
  lastCare: number;
};

const STORAGE_KEY = "kahy.pet-garden.v1";
const NEGLECT_WINDOW = 24 * 60 * 60 * 1000;

const defaultState: PetGardenState = {
  version: 1,
  flowerId: "Clavel",
  happiness: 70,
  bond: 12,
  careCounts: { food: 0, play: 0, love: 0 },
  lastCare: Date.now(),
};

function readState(): PetGardenState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const data = JSON.parse(raw) as Partial<PetGardenState>;
    if (data.version !== 1 || !data.careCounts) return defaultState;
    return { ...defaultState, ...data };
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
};

const moodMessages: Record<string, string> = {
  "difícil": "Está bien tener un día difícil. Aquí me quedo contigo un momento.",
  "pesado": "Cuando todo pesa, un cuidado pequeño también cuenta. Gracias por estar aquí.",
  "neutral": "Los días neutrales también son válidos. Seguimos avanzando juntos.",
  "tranquilo": "Qué bien se siente esta calma. La disfruto contigo.",
  "bien": "Me alegra mucho verte así. ¡Gracias por compartirlo conmigo!",
};

export function usePetGarden() {
  const [state, setState] = useState<PetGardenState>(readState);
  const [message, setMessage] = useState("Aquí estoy para acompañarte un ratito.");

  useEffect(() => persist(state), [state]);

  const totalCare = state.careCounts.food + state.careCounts.play + state.careCounts.love;
  const isNeglected = Date.now() - state.lastCare > NEGLECT_WINDOW;
  const mood: PetMood = isNeglected ? "triste" : "feliz";
  const growth = Math.min(3, 1 + Math.floor(totalCare / 3));
  const growthPhase = isNeglected ? 4 : growth;

  function care(action: CareAction) {
    setState((current) => {
      const nextCounts = { ...current.careCounts, [action]: current.careCounts[action] + 1 };
      return {
        ...current,
        happiness: Math.min(100, current.happiness + (action === "play" ? 12 : 8)),
        bond: Math.min(100, current.bond + 5),
        careCounts: nextCounts,
        lastCare: Date.now(),
      };
    });
    setMessage(careMessages[action]);
  }

  function reactToMood(moodValue: string) {
    setState((current) => ({ ...current, bond: Math.min(100, current.bond + 2) }));
    setMessage(moodMessages[moodValue] || "Gracias por contarme cómo te sientes hoy.");
  }

  function setFlower(id: FlowerId) {
    setState((current) => ({ ...current, flowerId: id }));
    setMessage("Gracias por elegirme. Creceremos juntas a tu ritmo.");
  }

  return {
    flowerId: state.flowerId,
    happiness: state.happiness,
    bond: state.bond,
    growth,
    growthPhase,
    mood,
    isNeglected,
    message,
    care,
    reactToMood,
    setFlower,
  };
}
