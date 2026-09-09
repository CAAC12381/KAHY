import { addEmotionEntry, clearEmotionEntries, ensureSchema, listEmotionEntries } from "../_lib/db.js";

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown };
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } };

const emotions = new Set(["alegría", "calma", "alivio", "esperanza", "tristeza", "ansiedad", "miedo", "enojo", "frustración", "culpa", "soledad", "cansancio", "confusión", "agobio", "neutral"]);
const intensities = new Set(["suave", "media", "intensa", "no_clara"]);
const progressValues = new Set(["expresó", "identificó", "reflexionó", "decidió", "actuó", "pidió_apoyo"]);
const confidences = new Set(["media", "alta"]);

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ensureSchema();
    const queryDeviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId;
    if (req.method === "GET") {
      if (!queryDeviceId) return res.status(400).json({ error: "Falta deviceId." });
      return res.status(200).json({ entries: await listEmotionEntries(queryDeviceId) });
    }
    if (req.method === "DELETE") {
      if (!queryDeviceId) return res.status(400).json({ error: "Falta deviceId." });
      await clearEmotionEntries(queryDeviceId);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "POST") {
      const body = req.body as { deviceId?: string; entry?: Record<string, unknown> } | undefined;
      const entry = body?.entry;
      if (!body?.deviceId || !entry || typeof entry.id !== "string" || typeof entry.at !== "number" ||
        typeof entry.primary !== "string" || !emotions.has(entry.primary) ||
        typeof entry.intensity !== "string" || !intensities.has(entry.intensity) ||
        typeof entry.progress !== "string" || !progressValues.has(entry.progress) ||
        typeof entry.confidence !== "string" || !confidences.has(entry.confidence)) {
        return res.status(400).json({ error: "Registro emocional inválido." });
      }
      await addEmotionEntry(body.deviceId, {
        id: entry.id.slice(0, 80), at: entry.at, primary: entry.primary,
        detail: typeof entry.detail === "string" ? entry.detail.slice(0, 120) : "",
        intensity: entry.intensity, progress: entry.progress, confidence: entry.confidence,
      });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Método no permitido." });
  } catch (error) {
    console.error("[KAHY DB]", error instanceof Error ? error.message : error);
    return res.status(503).json({ code: "DB_NOT_CONFIGURED", error: "La base de datos todavía no está disponible en el servidor." });
  }
}
