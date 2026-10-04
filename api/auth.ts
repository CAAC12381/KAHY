import { currentAccount, loginAccount, logoutSession, registerAccount } from './_lib/auth.js'
import { ensureSchema } from './_lib/db.js'

type VercelLikeRequest = {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
}
type VercelLikeResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

/**
 * POST /api/auth  — body: { action, ... }
 *   register { email, password, deviceId } -> 201 { token, email, dataId }
 *   login    { email, password }           -> 200 { token, email, dataId }
 *   me       (Authorization: Bearer)       -> 200 { email, dataId } | 401
 *   logout   (Authorization: Bearer)       -> 200 { ok: true }
 *
 * Un solo archivo para las cuatro acciones a propósito: el plan Hobby de
 * Vercel admite 12 funciones por despliegue y api/ ya usa 10.
 */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' })

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const forwardedFor = req.headers['x-forwarded-for']
  const clientId = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.socket?.remoteAddress || 'unknown'

  try {
    await ensureSchema()
    const result =
      body.action === 'register' ? await registerAccount(body, clientId)
      : body.action === 'login' ? await loginAccount(body, clientId)
      : body.action === 'me' ? await currentAccount(req.headers.authorization)
      : body.action === 'logout' ? await logoutSession(req.headers.authorization)
      : { status: 400, body: { error: 'Acción no reconocida.' } }
    return res.status(result.status).json(result.body)
  } catch (error) {
    console.error('[KAHY AUTH]', error instanceof Error ? error.message : error)
    return res.status(503).json({ code: 'DB_NOT_CONFIGURED', error: 'El servicio de cuentas todavía no está disponible.' })
  }
}
