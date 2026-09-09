import { ensureSchema, listScreenings, addScreening, type StoredScreeningResult } from '../_lib/db.js'

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }

/**
 * GET  /api/data/screenings?deviceId=... -> { results: StoredScreeningResult[] }
 * POST /api/data/screenings              -> body: { deviceId, result } -> { ok: true }
 */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    await ensureSchema()

    if (req.method === 'GET') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      const results = await listScreenings(deviceId)
      return res.status(200).json({ results })
    }

    if (req.method === 'POST') {
      const body = req.body as { deviceId?: string; result?: Partial<StoredScreeningResult> } | undefined
      const deviceId = body?.deviceId
      const result = body?.result
      if (!deviceId || !result || typeof result.id !== 'string' || typeof result.completedAt !== 'number' || !Array.isArray(result.answers) || typeof result.score !== 'number' || typeof result.band !== 'string') {
        return res.status(400).json({ error: 'Falta deviceId o el resultado es inválido.' })
      }
      await addScreening(deviceId, {
        id: result.id,
        completedAt: result.completedAt,
        answers: result.answers,
        score: result.score,
        band: result.band,
        item9Positive: result.item9Positive,
      })
      return res.status(200).json({ ok: true })
    }

    res.status(405).json({ error: 'Método no permitido.' })
  } catch (error) {
    console.error('[KAHY DB]', error instanceof Error ? error.message : error)
    res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'La base de datos todavía no está disponible en el servidor.' })
  }
}
