import { useEffect, useState } from "react";
import type { ScreeningId, ScreeningResult } from "../types";
import { fetchRemoteScreenings, saveRemoteScreening } from "../services/dataApi";
import { computeScreeningFlow, emptyFlowPrefs, REMIND_LATER_MS, visibleRecommendations, type FlowPrefs, type TraumaAnswer } from "../lib/screeningFlow";
import { needsCrisisSupport } from "../mock/screenings";

const STORAGE_KEY = "kahy.screenings.v1";
const SUPPORT_ACK_KEY = "kahy.screenings.support-ack.v1";
/** Saltar / recordar más tarde y la pregunta opcional de trauma. Solo vive en este dispositivo. */
const FLOW_KEY = "kahy.screening-flow.v1";
const MAX_RESULTS = 40;

function readResults(): ScreeningResult[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((entry): entry is ScreeningResult => Boolean(entry) && typeof (entry as ScreeningResult).id === "string" && typeof (entry as ScreeningResult).completedAt === "number");
  } catch {
    return [];
  }
}

function writeResults(results: ScreeningResult[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(-MAX_RESULTS)));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

function readSupportAcknowledged(): boolean {
  try {
    return window.localStorage.getItem(SUPPORT_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

function readFlowPrefs(): FlowPrefs {
  try {
    const data = JSON.parse(window.localStorage.getItem(FLOW_KEY) || "null") as Partial<FlowPrefs> | null;
    if (!data || typeof data !== "object") return emptyFlowPrefs;
    const trauma = data.trauma && typeof data.trauma.at === "number" && ["si", "no", "prefiero-no-responder"].includes(data.trauma.answer) ? data.trauma : undefined;
    return { skipped: { ...data.skipped }, remindAt: { ...data.remindAt }, ...(trauma ? { trauma } : {}) };
  } catch {
    return emptyFlowPrefs;
  }
}

function writeFlowPrefs(prefs: FlowPrefs) {
  try {
    window.localStorage.setItem(FLOW_KEY, JSON.stringify(prefs));
  } catch {
    // La app sigue funcionando si el navegador bloquea el almacenamiento local.
  }
}

/**
 * History of self-report screening results, mirrored to Postgres by deviceId
 * so it survives a cleared cache (localStorage stays the fast local read).
 * Deliberately does not compute a "risk level": it only ever surfaces the published band/cutoff
 * for the instrument itself, plus crisis support when the PHQ-9 safety item or Paykel is endorsed.
 * The adaptive route (which module to suggest next) comes from lib/screeningFlow.
 */
export function useScreenings(deviceId: string, onCompleted?: (result: ScreeningResult) => void) {
  const [results, setResults] = useState<ScreeningResult[]>(readResults);
  const [supportAcknowledged, setSupportAcknowledged] = useState<boolean>(readSupportAcknowledged);
  const [flowPrefs, setFlowPrefs] = useState<FlowPrefs>(readFlowPrefs);

  useEffect(() => {
    fetchRemoteScreenings(deviceId).then((remote) => {
      if (!remote || !remote.length) return;
      writeResults(remote as ScreeningResult[]);
      setResults(remote as ScreeningResult[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => writeFlowPrefs(flowPrefs), [flowPrefs]);

  function saveResult(result: ScreeningResult) {
    setResults((current) => {
      const next = [...current, result].slice(-MAX_RESULTS);
      writeResults(next);
      return next;
    });
    saveRemoteScreening(deviceId, result);
    onCompleted?.(result);
    if (needsCrisisSupport(result)) {
      setSupportAcknowledged(false);
      try {
        window.localStorage.removeItem(SUPPORT_ACK_KEY);
      } catch {
        // Ignorado: el banner de apoyo simplemente seguirá visible en esta sesión.
      }
    }
  }

  function acknowledgeSupport() {
    setSupportAcknowledged(true);
    try {
      window.localStorage.setItem(SUPPORT_ACK_KEY, "1");
    } catch {
      // La app sigue funcionando si el navegador bloquea el almacenamiento local.
    }
  }

  /** "Saltar por ahora": no se vuelve a sugerir hasta que un resultado nuevo la origine otra vez. */
  function skipRecommendation(id: ScreeningId) {
    setFlowPrefs((current) => ({ ...current, skipped: { ...current.skipped, [id]: Date.now() } }));
  }

  /** "Recordarme más tarde": vuelve a aparecer al día siguiente. */
  function remindLater(id: ScreeningId) {
    setFlowPrefs((current) => ({ ...current, remindAt: { ...current.remindAt, [id]: Date.now() + REMIND_LATER_MS } }));
  }

  /** Vuelve a mostrar todo lo que se saltó o pospuso. */
  function restoreRecommendations() {
    setFlowPrefs((current) => ({ ...emptyFlowPrefs, ...(current.trauma ? { trauma: current.trauma } : {}) }));
  }

  function answerTrauma(answer: TraumaAnswer) {
    setFlowPrefs((current) => ({ ...current, trauma: { answer, at: Date.now() } }));
  }

  function reset() {
    writeResults([]);
    setResults([]);
    setFlowPrefs(emptyFlowPrefs);
    try {
      window.localStorage.removeItem(SUPPORT_ACK_KEY);
      window.localStorage.removeItem(FLOW_KEY);
    } catch {
      // La app sigue funcionando si el navegador bloquea el almacenamiento local.
    }
    setSupportAcknowledged(false);
  }

  function latestOf(id: ScreeningId): ScreeningResult | undefined {
    for (let index = results.length - 1; index >= 0; index -= 1) {
      if (results[index].id === id) return results[index];
    }
    return undefined;
  }

  function historyOf(id: ScreeningId): ScreeningResult[] {
    return results.filter((entry) => entry.id === id);
  }

  const flow = computeScreeningFlow(results, flowPrefs.trauma);
  const recommendations = visibleRecommendations(flow.recommendations, flowPrefs, Date.now());
  const showSupportBanner = flow.crisis && !supportAcknowledged;

  /** Al crear la cuenta: sube los resultados que hasta ahora solo estaban en este dispositivo. */
  function uploadAll(accountDataId: string) {
    results.forEach((result) => saveRemoteScreening(accountDataId, result));
  }

  return {
    results,
    saveResult,
    latestOf,
    historyOf,
    flow,
    recommendations,
    hiddenRecommendations: flow.recommendations.length - recommendations.length,
    skipRecommendation,
    remindLater,
    restoreRecommendations,
    answerTrauma,
    showSupportBanner,
    acknowledgeSupport,
    reset,
    uploadAll,
  };
}

export type ScreeningsState = ReturnType<typeof useScreenings>;
