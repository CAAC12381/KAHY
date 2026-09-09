import { ensureSchema, getProfile, upsertProfile, deleteAllDataForDevice, type StoredProfile } from '../_lib/db.js'

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }

/**
 * GET  /api/data/profile?deviceId=... -> { profile: StoredProfile | null }
 * PUT  /api/data/profile               -> body: { deviceId, profile } -> { ok: true }
 * DELETE /api/data/profile?deviceId=... -> deletes every table's rows for this device -> { ok: true }
 *
 * No login: deviceId is an anonymous id generated client-side
 * (src/lib/deviceId.ts). This mirrors what the app already stored in
 * localStorage's kahy.registration.v1 — the database just makes it durable
 * across a cleared cache or a fresh browser profile.
 */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    await ensureSchema()

    if (req.method === 'GET') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      const profile = await getProfile(deviceId)
      return res.status(200).json({ profile })
    }

    if (req.method === 'PUT') {
      const body = req.body as { deviceId?: string; profile?: Partial<StoredProfile> } | undefined
      const deviceId = body?.deviceId
      const profile = body?.profile
      if (!deviceId || !profile) return res.status(400).json({ error: 'Falta deviceId o profile.' })
      await upsertProfile(deviceId, {
        name: typeof profile.name === 'string' ? profile.name : 'Invitado',
        companionType: typeof profile.companionType === 'string' ? profile.companionType : 'mascota',
        mascot: typeof profile.mascot === 'string' ? profile.mascot : 'vaca',
        flower: typeof profile.flower === 'string' ? profile.flower : 'Clavel',
        city: typeof profile.city === 'string' ? profile.city : 'Morelia',
        goals: Array.isArray(profile.goals) ? profile.goals : [],
        preferences: (profile.preferences as Record<string, unknown> | undefined) || {},
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      await deleteAllDataForDevice(deviceId)
      return res.status(200).json({ ok: true })
    }

    res.status(405).json({ error: 'Método no permitido.' })
  } catch (error) {
    // Cubre tanto "todavía no se configuró POSTGRES_URL" como cualquier
    // falla real de conexión — en ambos casos el cliente ya trata esto
    // como "no disponible por ahora" y sigue funcionando con localStorage.
    console.error('[KAHY DB]', error instanceof Error ? error.message : error)
    res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'La base de datos todavía no está disponible en el servidor.' })
  }
}
