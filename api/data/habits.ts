import { ensureSchema, listHabitDays, upsertHabitDay } from '../_lib/db.js'
import { withDataAccess } from '../_lib/auth.js'

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }

async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    await ensureSchema()
    if (req.method === 'GET') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      return res.status(200).json({ days: await listHabitDays(deviceId) })
    }
    if (req.method === 'PUT') {
      const body = req.body as { deviceId?: string; day?: { date?: string; completed?: unknown } } | undefined
      const deviceId = body?.deviceId
      const date = body?.day?.date
      const completed = body?.day?.completed
      if (!deviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(completed)) {
        return res.status(400).json({ error: 'Falta deviceId o el registro de hábitos es inválido.' })
      }
      await upsertHabitDay(deviceId, { date, completed: completed.filter((id): id is string => typeof id === 'string').slice(0, 20) })
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'Método no permitido.' })
  } catch (error) {
    console.error('[KAHY DB]', error instanceof Error ? error.message : error)
    return res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'La base de datos todavía no está disponible en el servidor.' })
  }
}

export default withDataAccess(handler)
