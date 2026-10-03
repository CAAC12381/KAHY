import { deleteTaskPlans, ensureSchema, listTaskPlans, sanitizeTaskPlan, upsertTaskPlan } from "../_lib/db.js";

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown };
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ensureSchema();
    const queryDeviceId = first(req.query.deviceId);
    if (req.method === "GET") {
      if (!queryDeviceId) return res.status(400).json({ error: "Falta deviceId." });
      return res.status(200).json({ plans: await listTaskPlans(queryDeviceId) });
    }
    if (req.method === "DELETE") {
      if (!queryDeviceId) return res.status(400).json({ error: "Falta deviceId." });
      await deleteTaskPlans(queryDeviceId, first(req.query.planId));
      return res.status(200).json({ ok: true });
    }
    if (req.method === "PUT") {
      const body = req.body as { deviceId?: string; plan?: unknown } | undefined;
      const plan = sanitizeTaskPlan(body?.plan);
      if (!body?.deviceId || !plan) return res.status(400).json({ error: "Plan inválido." });
      await upsertTaskPlan(body.deviceId, plan.id as string, plan);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Método no permitido." });
  } catch (error) {
    console.error("[KAHY DB]", error instanceof Error ? error.message : error);
    return res.status(503).json({ code: "DB_NOT_CONFIGURED", error: "La base de datos todavía no está disponible en el servidor." });
  }
}
