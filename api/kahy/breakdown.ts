import { getTaskBreakdown } from '../_lib/taskBreakdown.js'

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

/** Vercel Node.js serverless function — POST /api/kahy/breakdown (ver api/_lib/taskBreakdown.ts). */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' })
    return
  }

  const forwardedFor = req.headers['x-forwarded-for']
  const clientId = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
    || req.socket?.remoteAddress
    || 'vercel'

  const { status, body } = await getTaskBreakdown(req.body, clientId)
  res.status(status).json(body)
}
