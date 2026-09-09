import { ensureSchema, getPetGarden, upsertPetGarden, type StoredPetGarden } from '../_lib/db.js'

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }

/**
 * GET /api/data/pet-garden?deviceId=... -> { state: StoredPetGarden | null }
 * PUT /api/data/pet-garden              -> body: { deviceId, state } -> { ok: true }
 */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    await ensureSchema()

    if (req.method === 'GET') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      const state = await getPetGarden(deviceId)
      return res.status(200).json({ state })
    }

    if (req.method === 'PUT') {
      const body = req.body as { deviceId?: string; state?: Partial<StoredPetGarden> } | undefined
      const deviceId = body?.deviceId
      const state = body?.state
      if (!deviceId || !state || typeof state.happiness !== 'number' || typeof state.bond !== 'number' || typeof state.progress !== 'number' || typeof state.lastCare !== 'number') {
        return res.status(400).json({ error: 'Falta deviceId o el estado es inválido.' })
      }
      await upsertPetGarden(deviceId, {
        happiness: state.happiness,
        bond: state.bond,
        progress: state.progress,
        careCounts: state.careCounts || {},
        lastCare: state.lastCare,
      })
      return res.status(200).json({ ok: true })
    }

    res.status(405).json({ error: 'Método no permitido.' })
  } catch (error) {
    console.error('[KAHY DB]', error instanceof Error ? error.message : error)
    res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'La base de datos todavía no está disponible en el servidor.' })
  }
}
