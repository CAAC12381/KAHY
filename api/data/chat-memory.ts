import { ensureSchema, listChatMemory, addChatMemory, clearChatMemory } from '../_lib/db.js'

type VercelLikeRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
type VercelLikeResponse = { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }

/**
 * GET    /api/data/chat-memory?deviceId=... -> { entries: {topic, at}[] }
 * POST   /api/data/chat-memory              -> body: { deviceId, topic } -> { ok: true }
 * DELETE /api/data/chat-memory?deviceId=... -> { ok: true }
 *
 * Stores only the topic and a timestamp — never the raw message text — same
 * minimal footprint as the opt-in localStorage version (useChatMemory.ts),
 * just made durable. Only called when the person has rememberConversations on.
 */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    await ensureSchema()

    if (req.method === 'GET') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      const entries = await listChatMemory(deviceId)
      return res.status(200).json({ entries })
    }

    if (req.method === 'POST') {
      const body = req.body as { deviceId?: string; topic?: string } | undefined
      const deviceId = body?.deviceId
      const topic = body?.topic
      if (!deviceId || typeof topic !== 'string' || !topic) return res.status(400).json({ error: 'Falta deviceId o topic.' })
      await addChatMemory(deviceId, topic)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const deviceId = Array.isArray(req.query.deviceId) ? req.query.deviceId[0] : req.query.deviceId
      if (!deviceId) return res.status(400).json({ error: 'Falta deviceId.' })
      await clearChatMemory(deviceId)
      return res.status(200).json({ ok: true })
    }

    res.status(405).json({ error: 'Método no permitido.' })
  } catch (error) {
    console.error('[KAHY DB]', error instanceof Error ? error.message : error)
    res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'La base de datos todavía no está disponible en el servidor.' })
  }
}
