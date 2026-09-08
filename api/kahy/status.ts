import { getStatusPayload } from '../_lib/kahyAi'

/**
 * Vercel Node.js serverless function — GET /api/kahy/status.
 * Vite's dev-only middleware (vite.config.ts) covers `vite dev`; this file
 * is what actually serves the request on the deployed (Vercel) build.
 */
export default function handler(req: { method?: string }, res: {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json(getStatusPayload())
}
