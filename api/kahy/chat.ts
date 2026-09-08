import { getChatReply } from '../_lib/kahyAi'

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
 * Vercel Node.js serverless function — POST /api/kahy/chat.
 * Mirrors the Vite dev-server middleware (vite.config.ts) so the deployed
 * build actually has a backend: Vite plugins with `apply: 'serve'` are
 * stripped from production builds, so without this file the live site had
 * no way to reach OpenAI/Groq at all and silently used the local fallback
 * for every visitor, regardless of any key configured for local dev.
 */
export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' })
    return
  }

  // Vercel's Node runtime parses a JSON request body onto req.body for us.
  const body = req.body as { messages?: unknown } | undefined
  const forwardedFor = req.headers['x-forwarded-for']
  const clientId = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
    || req.socket?.remoteAddress
    || 'vercel'

  const { status, body: responseBody } = await getChatReply(body?.messages, clientId)
  res.status(status).json(responseBody)
}
