/**
 * Llamadas a Groq compartidas por el chat y por "Desglosar una tarea".
 *
 * El plan gratuito de Groq da 8,000 tokens por minuto POR MODELO, y cada
 * mensaje del chat gasta unos 3,000 (casi todo es el prompt del sistema). Con
 * un solo modelo, el tercer mensaje del minuto —sumando a todas las personas
 * que usan KAHY— recibía un 429 y el chat caía al motor local sin explicar por
 * qué. Por eso:
 *
 * 1. Razonamiento "bajo" en gpt-oss: en las pruebas las respuestas fueron
 *    igual de buenas, el doble de rápidas y con la mitad de tokens de salida.
 * 2. Si el modelo principal está saturado, se usa un modelo de respaldo, que
 *    tiene su propio límite aparte (también admite el esquema estricto).
 * 3. Tras un 429 se recuerda cuánto pidió Groq esperar, para no volver a
 *    tocar ese modelo antes de tiempo. Es memoria por instancia: en Vercel se
 *    pierde al enfriarse, lo que solo cuesta un 429 extra de ~150 ms.
 * 4. Si todos están saturados y la espera es corta, se espera una vez; si es
 *    larga, se lanza AiBusyError con los segundos, para que la app lo diga.
 */

export const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b'
const SHORT_WAIT_MS = 4_000

const cooldownUntil = new Map<string, number>()

export class AiBusyError extends Error {
  retryAfterSeconds: number
  constructor(retryAfterSeconds: number) {
    super(`IA saturada; reintentar en ${retryAfterSeconds} s`)
    this.retryAfterSeconds = retryAfterSeconds
  }
}

type GroqRequest = {
  apiKey: string
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  schemaName: string
  schema: unknown
  maxTokens: number
  signal: AbortSignal
}

export function groqModels(primary: string): string[] {
  const fallback = process.env.GROQ_FALLBACK_MODEL || GROQ_FALLBACK_MODEL
  return fallback && fallback !== primary ? [primary, fallback] : [primary]
}

/** Devuelve el JSON ya interpretado y el modelo que respondió. */
export async function groqStructuredCompletion(request: GroqRequest): Promise<{ data: Record<string, unknown>; model: string }> {
  const models = groqModels(request.model)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of models) {
      if ((cooldownUntil.get(model) ?? 0) > Date.now()) continue
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${request.apiKey}`, 'Content-Type': 'application/json' },
        signal: request.signal,
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens,
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
          messages: request.messages,
          response_format: { type: 'json_schema', json_schema: { name: request.schemaName, strict: true, schema: request.schema } },
        }),
      })

      if (response.status === 429) {
        cooldownUntil.set(model, Date.now() + retryAfterMs(response))
        lastError = new Error(`Groq 429 (${model})`)
        continue
      }
      // 5xx = Groq con problemas; 400 suele ser una salida que no cumplió el esquema. El otro modelo puede responder bien.
      if (response.status >= 500 || response.status === 400) {
        lastError = new Error(`Groq respondió ${response.status} (${model})`)
        continue
      }
      if (!response.ok) throw new Error(`Groq respondió ${response.status} (${model})`)

      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
      const content = payload.choices?.[0]?.message?.content
      if (!content) {
        lastError = new Error(`Respuesta vacía (${model})`)
        continue
      }
      try {
        return { data: JSON.parse(content) as Record<string, unknown>, model }
      } catch {
        lastError = new Error(`JSON inválido (${model})`)
      }
    }

    const wait = soonestAvailableMs(models)
    if (wait === null) break // Ningún modelo está en pausa: el fallo no fue por saturación.
    if (attempt === 0 && wait <= SHORT_WAIT_MS) {
      await sleep(wait, request.signal)
      continue
    }
    throw new AiBusyError(Math.max(1, Math.ceil(wait / 1000)))
  }

  throw lastError ?? new Error('Groq no respondió.')
}

function soonestAvailableMs(models: string[]): number | null {
  const now = Date.now()
  const waits = models.map((model) => (cooldownUntil.get(model) ?? 0) - now)
  if (waits.some((wait) => wait <= 0)) return null
  return Math.min(...waits)
}

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'))
  // Sin cabecera, 20 s: lo que suele tardar en liberarse parte del minuto.
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 120) * 1000 : 20_000
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason ?? new Error('Cancelado'))
    }, { once: true })
  })
}
