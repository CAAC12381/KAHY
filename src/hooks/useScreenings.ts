import { useState } from "react";
import type { ScreeningId, ScreeningResult } from "../types";

const STORAGE_KEY = "kahy.screenings.v1";
const SUPPORT_ACK_KEY = "kahy.screenings.support-ack.v1";
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

/**
 * Local, on-device history of self-report screening results (no backend — this app has none).
 * Deliberately does not compute a "risk level": it only ever surfaces the published band/cutoff
 * for the instrument itself, plus a support banner when the PHQ-9 safety item is endorsed.
 */
export function useScreenings() {
  const [results, setResults] = useState<ScreeningResult[]>(readResults);
  const [supportAcknowledged, setSupportAcknowledged] = useState<boolean>(readSupportAcknowledged);

  function saveResult(result: ScreeningResult) {
    setResults((current) => {
      const next = [...current, result].slice(-MAX_RESULTS);
      writeResults(next);
      return next;
    });
    if (result.item9Positive) {
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

  function reset() {
    writeResults([]);
    setResults([]);
    try {
      window.localStorage.removeItem(SUPPORT_ACK_KEY);
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

  const latestPhq9 = latestOf("phq9");
  const showSupportBanner = Boolean(latestPhq9?.item9Positive) && !supportAcknowledged;

  return { results, saveResult, latestOf, historyOf, showSupportBanner, acknowledgeSupport, reset };
}

export type ScreeningsState = ReturnType<typeof useScreenings>;
